import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authService } from '../../services/authService';
import { toast } from '../../components/Toast';

const OTP_LENGTH = 6;
const OTP_TTL_SECONDS = 10 * 60; // matches the backend's 10-minute code life
const RESEND_SECONDS = 60;       // matches the backend's 60-second cooldown
const GENERIC_ERROR = 'Something went wrong. Please try again.';

// Our API's own 4xx/503 messages are safe to show. Everything else — 500s,
// stack traces, internal/SMTP text, network errors — must never reach the
// screen, so it is replaced with one generic line.
const friendlyError = (err) => {
  const status = err?.response?.status;
  const data = err?.response?.data;
  const known = status === 503 || (status >= 400 && status < 500);
  if (known) {
    if (typeof data?.message === 'string' && data.message.trim()) return data.message;
    if (typeof data?.errors?.[0]?.msg === 'string' && data.errors[0].msg.trim()) return data.errors[0].msg;
  }
  return GENERIC_ERROR;
};

const emptyOtp = () => Array(OTP_LENGTH).fill('');

// ma***@gmail.com — never shows the full address back to the screen.
const maskEmail = (email) => {
  const [local = '', domain = ''] = String(email).split('@');
  return `${local.slice(0, 2)}***@${domain}`;
};

const fmtTime = (total) =>
  `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;

// Deliberately simple meter: length + character variety (backend rule = min 6).
const strengthOf = (password) => {
  if (!password) return { label: '', percent: 0, bar: 'bg-ink/20' };
  if (password.length < 6) return { label: 'Too short', percent: 15, bar: 'bg-clay-red' };
  let score = 0;
  if (password.length >= 8) score += 1;
  if (/[a-z]/.test(password)) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^\w\s]/.test(password)) score += 1;
  if (score <= 2) return { label: 'Weak', percent: 30, bar: 'bg-clay-red' };
  if (score === 3) return { label: 'Fair', percent: 55, bar: 'bg-saffron' };
  if (score === 4) return { label: 'Good', percent: 78, bar: 'bg-moss' };
  return { label: 'Strong', percent: 100, bar: 'bg-moss' };
};

const STEPS = ['Verify email', 'Enter code', 'New password'];

const ForgotPassword = () => {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState(emptyOtp());
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [secondsLeft, setSecondsLeft] = useState(OTP_TTL_SECONDS);
  const [resendIn, setResendIn] = useState(0);
  const [wrongAttempts, setWrongAttempts] = useState(0);

  const inputRefs = useRef([]);
  const navigate = useNavigate();

  // One tick drives both the 10:00 code countdown and the 60 s resend lock.
  useEffect(() => {
    if (step !== 2) return undefined;
    const id = setInterval(() => {
      setSecondsLeft((s) => (s > 0 ? s - 1 : 0));
      setResendIn((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(id);
  }, [step]);

  const startOtpStep = () => {
    setOtp(emptyOtp());
    setSecondsLeft(OTP_TTL_SECONDS);
    setResendIn(RESEND_SECONDS);
    setWrongAttempts(0);
    setError('');
    setStep(2);
    setTimeout(() => inputRefs.current[0]?.focus(), 50);
  };

  // Step 1 → 2 (also used by "Resend code").
  const requestOtp = async (options = {}) => {
    setLoading(true);
    setError('');
    try {
      await authService.forgotPassword({ email: email.trim() });
      startOtpStep();
      if (options.resend) toast.success(`A new code was sent to ${maskEmail(email.trim())}`);
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleRequestOtp = (e) => {
    e.preventDefault();
    requestOtp();
  };

  const handleResend = () => {
    if (resendIn > 0 || loading) return;
    requestOtp({ resend: true });
  };

  const setOtpAt = (index, value) =>
    setOtp((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });

  const handleChangeDigit = (index, e) => {
    const value = e.target.value.replace(/\D/g, '');
    if (!value) {
      setOtpAt(index, '');
      return;
    }
    const chars = value.split('');
    setOtp((prev) => {
      const next = [...prev];
      chars.forEach((c, k) => {
        if (index + k < OTP_LENGTH) next[index + k] = c;
      });
      return next;
    });
    const target = Math.min(index + chars.length, OTP_LENGTH - 1);
    inputRefs.current[target]?.focus();
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace') {
      if (otp[index]) return; // browser clears the box itself
      e.preventDefault();
      if (index > 0) {
        setOtpAt(index - 1, '');
        inputRefs.current[index - 1]?.focus();
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const text = (e.clipboardData.getData('text') || '').replace(/\D/g, '').slice(0, OTP_LENGTH);
    if (!text) return;
    const next = emptyOtp();
    text.split('').forEach((d, i) => { next[i] = d; });
    setOtp(next);
    inputRefs.current[Math.min(text.length, OTP_LENGTH - 1)]?.focus();
  };

  // Step 2 → 3
  const handleVerify = async (e) => {
    e.preventDefault();
    const code = otp.join('');
    if (code.length !== OTP_LENGTH) {
      setError('Enter the 6-digit code');
      return;
    }
    if (secondsLeft <= 0) {
      setError('This code has expired. Please request a new one.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const { data } = await authService.verifyOtp({ email: email.trim(), otp: code });
      setResetToken(data.resetToken);
      setNewPassword('');
      setConfirmPassword('');
      setShowPassword(false);
      setStep(3);
    } catch (err) {
      const attempts = wrongAttempts + 1;
      setWrongAttempts(attempts);
      setError(
        attempts >= 5
          ? 'Too many incorrect attempts. Please request a new code.'
          : friendlyError(err)
      );
      setOtp(emptyOtp());
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  // Step 3 → done
  const handleReset = async (e) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await authService.resetPassword({
        email: email.trim(),
        resetToken,
        newPassword
      });
      toast.success('Password changed');
      navigate('/auth', { replace: true });
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setLoading(false);
    }
  };

  const strength = strengthOf(newPassword);
  const otpComplete = otp.every((d) => d !== '');

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center py-12 px-4">
      <div className="bg-white rounded-sm border border-ink/10 p-8 w-full max-w-md">
        <div className="text-center mb-6">
          <span className="text-4xl">🏺</span>
          <h1 className="text-2xl font-bold text-ink mt-2">Forgot password</h1>
          <p className="text-sm text-ink-soft mt-1">Reset it with a code sent to your email</p>
        </div>

        {/* Progress: 1 verify email → 2 enter code → 3 new password */}
        <div className="flex items-start justify-between mb-8">
          {STEPS.map((label, i) => {
            const n = i + 1;
            const done = step > n;
            const active = step === n;
            return (
              <div key={label} className="flex flex-col items-center flex-1 min-w-0">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold border transition ${
                    active
                      ? 'bg-terracotta text-white border-terracotta'
                      : done
                        ? 'bg-moss text-white border-moss'
                        : 'bg-white text-ink-faint border-ink/20'
                  }`}
                >
                  {done ? '✓' : n}
                </div>
                <span
                  className={`text-[11px] mt-1 text-center leading-tight ${
                    active ? 'text-ink font-medium' : 'text-ink-faint'
                  }`}
                >
                  {label}
                </span>
              </div>
            );
          })}
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-sm mb-6 text-sm">
            {error}
          </div>
        )}

        {step === 1 && (
          <form onSubmit={handleRequestOtp} className="space-y-4">
            <div>
              <label className="text-sm text-ink-soft font-medium">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
                className="w-full border border-ink/15 rounded-sm px-4 py-2 mt-1"
                placeholder="Enter your email"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-terracotta text-white py-3 rounded-sm hover:bg-terracotta-dark transition font-semibold disabled:opacity-50"
            >
              {loading ? 'Sending code…' : 'Send verification code'}
            </button>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={handleVerify} className="space-y-5">
            <p className="text-sm text-ink-soft text-center">
              We sent a 6-digit code to
              <br />
              <span className="text-ink font-medium">{maskEmail(email.trim())}</span>
            </p>

            <div className={`text-center text-sm font-mono ${secondsLeft > 0 ? 'text-ink-soft' : 'text-clay-red'}`}>
              {secondsLeft > 0 ? (
                <>Code expires in <span className="text-ink font-semibold">{fmtTime(secondsLeft)}</span></>
              ) : (
                'Code expired — request a new one'
              )}
            </div>

            <div className="flex justify-center gap-2 sm:gap-3" onPaste={handlePaste}>
              {otp.map((digit, i) => (
                <input
                  key={i}
                  ref={(el) => { inputRefs.current[i] = el; }}
                  value={digit}
                  onChange={(e) => handleChangeDigit(i, e)}
                  onKeyDown={(e) => handleKeyDown(i, e)}
                  onFocus={(e) => e.target.select()}
                  inputMode="numeric"
                  autoComplete={i === 0 ? 'one-time-code' : 'off'}
                  maxLength={OTP_LENGTH}
                  aria-label={`Digit ${i + 1}`}
                  className="w-10 h-12 sm:w-11 sm:h-13 text-center text-lg font-semibold border border-ink/15 rounded-sm focus:border-terracotta focus:ring-1 focus:ring-terracotta outline-none"
                />
              ))}
            </div>

            <button
              type="submit"
              disabled={loading || !otpComplete || secondsLeft <= 0}
              className="w-full bg-terracotta text-white py-3 rounded-sm hover:bg-terracotta-dark transition font-semibold disabled:opacity-50"
            >
              {loading ? 'Verifying…' : 'Verify code'}
            </button>

            <div className="flex items-center justify-between text-sm">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="text-ink-soft hover:text-ink underline"
              >
                Use a different email
              </button>
              <button
                type="button"
                onClick={handleResend}
                disabled={resendIn > 0 || loading}
                className="text-terracotta-dark font-medium hover:underline disabled:text-ink-faint disabled:no-underline"
              >
                {resendIn > 0 ? `Resend code (${resendIn}s)` : 'Resend code'}
              </button>
            </div>
          </form>
        )}

        {step === 3 && (
          <form onSubmit={handleReset} className="space-y-4">
            <p className="text-sm text-ink-soft text-center">
              Set a new password for
              <br />
              <span className="text-ink font-medium">{maskEmail(email.trim())}</span>
            </p>

            <div>
              <label className="text-sm text-ink-soft font-medium">New password</label>
              <div className="relative mt-1">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={6}
                  autoFocus
                  className="w-full border border-ink/15 rounded-sm px-4 py-2 pr-16"
                  placeholder="At least 6 characters"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-terracotta-dark font-medium hover:underline px-2 py-1"
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
              {newPassword && (
                <div className="mt-2">
                  <div className="h-1.5 bg-linen rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${strength.bar}`}
                      style={{ width: `${strength.percent}%` }}
                    />
                  </div>
                  <p className="text-xs text-ink-soft mt-1">
                    Strength: <span className="font-medium text-ink">{strength.label}</span>
                  </p>
                </div>
              )}
            </div>

            <div>
              <label className="text-sm text-ink-soft font-medium">Confirm password</label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
                className="w-full border border-ink/15 rounded-sm px-4 py-2 mt-1"
                placeholder="Repeat the new password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-terracotta text-white py-3 rounded-sm hover:bg-terracotta-dark transition font-semibold disabled:opacity-50"
            >
              {loading ? 'Saving…' : 'Set new password'}
            </button>

            <button
              type="button"
              onClick={() => setStep(1)}
              className="w-full text-sm text-ink-soft hover:text-ink underline"
            >
              Use a different email
            </button>
          </form>
        )}

        <p className="text-center text-sm text-ink-soft mt-6">
          Remembered it?{' '}
          <Link to="/auth" className="text-terracotta-dark font-medium hover:underline">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
};

export default ForgotPassword;
