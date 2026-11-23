import crypto from 'crypto';
import User from '../models/User.js';
import ApiError from '../utils/ApiError.js';
import catchAsync from '../utils/catchAsync.js';
import { sendOtpEmail, isMailerHealthy, redactMailerSecrets } from '../utils/mailer.js';

const OTP_TTL_MS = 10 * 60 * 1000;          // code valid 10 minutes
const RESEND_COOLDOWN_MS = 60 * 1000;        // one send per minute per email
const REQUEST_WINDOW_MS = 60 * 60 * 1000;    // max 5 sends per hour per email
const MAX_REQUESTS_PER_HOUR = 5;
const MAX_VERIFY_ATTEMPTS = 5;               // wrong codes before the OTP is locked
const RESET_TOKEN_TTL_MS = 10 * 60 * 1000;   // single-use token valid 10 minutes

// Same message for every outcome (account exists or not) — never enumerate emails.
const GENERIC_MESSAGE =
  'If an account exists for that email, a 6-digit verification code has been sent. It is valid for 10 minutes.';

// One message for every verify failure (unknown email, wrong code, expired,
// locked) — so probing verify-otp cannot reveal whether an account exists.
const VERIFY_FAILURE_MESSAGE = 'Invalid or expired verification code';

// Uniform answer while SMTP is known-broken — sent for EVERY email so the
// 503 itself never reveals whether an account exists.
const MAIL_DOWN_MESSAGE = 'Email service is temporarily unavailable. Please try again later.';

// The OTP is stored only as an HMAC keyed with a server secret, so a database
// leak cannot be brute-forced down to the 6-digit code offline.
const otpSecret = () => process.env.JWT_SECRET || 'craftveda-otp-dev-secret';
const hashOtp = (otp) => crypto.createHmac('sha256', otpSecret()).update(String(otp)).digest('hex');
const hashToken = (token) => crypto.createHash('sha256').update(String(token)).digest('hex');

// Constant-time compare of two equal-length hex digests.
const digestsMatch = (a, b) => {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  if (bufA.length !== bufB.length || bufA.length === 0) return false;
  return crypto.timingSafeEqual(bufA, bufB);
};

const normalizeEmail = (email) => String(email).toLowerCase().trim();

// POST /api/auth/forgot-password — always the same generic response.
export const forgotPassword = catchAsync(async (req, res) => {
  // SMTP is known-broken (startup verify failed or the last send failed with
  // an auth/connection error): one uniform 503 for EVERY email, so the state
  // change is not an enumeration oracle.
  if (!isMailerHealthy()) {
    throw new ApiError(503, MAIL_DOWN_MESSAGE);
  }

  const email = normalizeEmail(req.body.email);
  const user = await User.findOne({ email });

  if (user && user.status !== 'BLOCKED') {
    const now = Date.now();
    const lastSent = user.passwordResetOtpLastSentAt?.getTime() || 0;
    const windowStart = user.passwordResetOtpWindowStart?.getTime() || 0;
    const windowExpired = windowStart === 0 || now - windowStart >= REQUEST_WINDOW_MS;
    const windowCount = windowExpired ? 0 : (user.passwordResetOtpRequestCount || 0);
    const inCooldown = lastSent !== 0 && now - lastSent < RESEND_COOLDOWN_MS;

    // Cooldown / hourly cap are enforced SILENTLY (still the generic 200) so
    // the response never reveals whether the email is registered.
    if (!inCooldown && windowCount < MAX_REQUESTS_PER_HOUR) {
      const otp = String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');

      // Remember the pre-write state so a failed send can undo everything.
      const prev = {
        lastSentAt: user.passwordResetOtpLastSentAt,
        windowStart: user.passwordResetOtpWindowStart,
        requestCount: user.passwordResetOtpRequestCount,
        resetToken: user.resetPasswordToken,
        resetExpire: user.resetPasswordExpire
      };

      await User.updateOne({ _id: user._id }, {
        $set: {
          passwordResetOtpHash: hashOtp(otp),
          passwordResetOtpExpires: new Date(now + OTP_TTL_MS),
          passwordResetOtpAttempts: 0,
          passwordResetOtpLastSentAt: new Date(now),
          passwordResetOtpWindowStart: windowExpired ? new Date(now) : user.passwordResetOtpWindowStart,
          passwordResetOtpRequestCount: windowCount + 1
        },
        // A new code invalidates any reset token issued for an older code.
        $unset: { resetPasswordToken: '', resetPasswordExpire: '' }
      });

      try {
        // 503 in production when SMTP is missing; in development the code is
        // printed to the server console instead. Never logged when SMTP works.
        await sendOtpEmail(user.email, otp);
      } catch (err) {
        // Real error goes to the SERVER console only — error code and message
        // with credentials redacted. Never the OTP, never SMTP_PASS/SMTP_USER.
        console.error(
          `[mailer] send failed for ${user.email} (code=${err?.code || 'n/a'}): ${redactMailerSecrets(err?.message)}`
        );

        // Undo the write: the cooldown, the hourly window and the stored code
        // must not survive a send that never happened.
        const $unset = {
          passwordResetOtpHash: '',
          passwordResetOtpExpires: '',
          passwordResetOtpAttempts: ''
        };
        const $set = {};
        if (prev.lastSentAt) $set.passwordResetOtpLastSentAt = prev.lastSentAt;
        else $unset.passwordResetOtpLastSentAt = '';
        if (prev.windowStart) $set.passwordResetOtpWindowStart = prev.windowStart;
        else $unset.passwordResetOtpWindowStart = '';
        if (prev.requestCount != null) $set.passwordResetOtpRequestCount = prev.requestCount;
        else $unset.passwordResetOtpRequestCount = '';
        if (prev.resetToken) $set.resetPasswordToken = prev.resetToken;
        else $unset.resetPasswordToken = '';
        if (prev.resetExpire) $set.resetPasswordExpire = prev.resetExpire;
        else $unset.resetPasswordExpire = '';
        await User.updateOne({ _id: user._id }, { $set, $unset });

        // Fall through: a mail failure answers the SAME generic 200 as an
        // unknown email (never a 500, never SMTP text).
      }
    }
  }

  res.json({ success: true, message: GENERIC_MESSAGE });
});

// POST /api/auth/verify-otp — checks the code, returns a single-use reset token.
export const verifyOtp = catchAsync(async (req, res) => {
  const email = normalizeEmail(req.body.email);
  const otp = String(req.body.otp);
  const user = await User.findOne({ email });

  const hasOtp =
    user &&
    user.passwordResetOtpHash &&
    user.passwordResetOtpExpires &&
    user.passwordResetOtpExpires.getTime() > Date.now();
  const locked = hasOtp && (user.passwordResetOtpAttempts || 0) >= MAX_VERIFY_ATTEMPTS;

  if (!hasOtp || locked) {
    throw new ApiError(400, VERIFY_FAILURE_MESSAGE);
  }

  if (!digestsMatch(hashOtp(otp), user.passwordResetOtpHash)) {
    const attempts = (user.passwordResetOtpAttempts || 0) + 1;
    await User.updateOne({ _id: user._id }, {
      $set: {
        passwordResetOtpAttempts: attempts,
        // 5th wrong code: expire it so it can never succeed again.
        ...(attempts >= MAX_VERIFY_ATTEMPTS ? { passwordResetOtpExpires: new Date(0) } : {})
      }
    });
    throw new ApiError(400, VERIFY_FAILURE_MESSAGE);
  }

  // Success: mint a short-lived, single-use reset token. Only its hash is stored.
  const resetToken = crypto.randomBytes(32).toString('hex');
  await User.updateOne({ _id: user._id }, {
    $set: {
      resetPasswordToken: hashToken(resetToken),
      resetPasswordExpire: new Date(Date.now() + RESET_TOKEN_TTL_MS),
      passwordResetOtpAttempts: 0
    },
    // The code is consumed — one code issues one reset token.
    $unset: { passwordResetOtpHash: '', passwordResetOtpExpires: '' }
  });

  res.json({ success: true, message: 'Verification code verified', resetToken });
});

// POST /api/auth/reset-password — consumes the reset token and sets the password.
export const resetPassword = catchAsync(async (req, res) => {
  const { email, resetToken, newPassword } = req.body;
  const user = await User.findOne({ email: normalizeEmail(email) });

  const validToken =
    user &&
    user.resetPasswordToken &&
    user.resetPasswordExpire &&
    user.resetPasswordExpire.getTime() > Date.now() &&
    digestsMatch(hashToken(resetToken), user.resetPasswordToken);

  if (!validToken) {
    throw new ApiError(400, 'Reset link is invalid or has expired. Please request a new code.');
  }

  // bcrypt pre-save hook hashes the new password (same path as register).
  user.password = newPassword;
  await user.save();

  // Single use: clear every OTP / reset field.
  await User.updateOne({ _id: user._id }, {
    $unset: {
      resetPasswordToken: '',
      resetPasswordExpire: '',
      passwordResetOtpHash: '',
      passwordResetOtpExpires: '',
      passwordResetOtpAttempts: '',
      passwordResetOtpLastSentAt: '',
      passwordResetOtpWindowStart: '',
      passwordResetOtpRequestCount: ''
    }
  });

  res.json({ success: true, message: 'Password updated successfully' });
});

export default { forgotPassword, verifyOtp, resetPassword };
