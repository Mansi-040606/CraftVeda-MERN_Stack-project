import nodemailer from 'nodemailer';
import ApiError from './ApiError.js';

// Reads the SMTP_* variables from process.env only and never logs them.
export const isSmtpConfigured = () =>
  Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS && process.env.MAIL_FROM);

// --- mailer health --------------------------------------------------------
// Module-level flag: false once the startup verify() or an auth/connection
// send failure proves SMTP unusable, back to true after the next successful
// send. While false, forgot-password answers one uniform 503 for EVERY email
// (existing or not) so the state never becomes an enumeration oracle.
let mailerHealthy = true;
export const isMailerHealthy = () => mailerHealthy;

// Remove credentials from text that is about to be logged — SMTP errors can
// echo the username in their response line; the password must never appear.
export const redactMailerSecrets = (text) => {
  let out = String(text ?? '');
  const pass = process.env.SMTP_PASS;
  const user = process.env.SMTP_USER;
  if (pass) out = out.split(pass).join('[redacted]');
  if (user) out = out.split(user).join('[redacted]');
  return out;
};

const CONNECTION_OR_AUTH_CODES = new Set([
  'EAUTH', 'ECONNECTION', 'ECONNREFUSED', 'ECONNRESET', 'ETIMEDOUT',
  'ESOCKET', 'EPIPE', 'EHOSTUNREACH', 'ENOTFOUND', 'EDNS'
]);
const isConnectionOrAuthError = (err) =>
  CONNECTION_OR_AUTH_CODES.has(String(err?.code || ''));

// --- test hooks (same pattern as GOOGLE_TOKEN_MOCK; never set in production) ---
// MAILER_MOCK_VERIFY_FAIL=1              -> startup verify() fails
// MAILER_MOCK_FAIL='a@b=EAUTH,c@d=EDATA' -> the FIRST send to each listed
//                                           address throws an SMTP-like error
//                                           with that code, later sends work
const mockFailCodes = () => {
  const map = new Map();
  for (const entry of String(process.env.MAILER_MOCK_FAIL || '').split(',')) {
    const [email, code] = entry.split('=');
    if (email && code) map.set(email.trim().toLowerCase(), code.trim());
  }
  return map;
};

const mockFiredOnce = new Set();
const mockSendFailure = (email) => {
  const key = String(email).toLowerCase();
  const code = mockFailCodes().get(key);
  if (!code || mockFiredOnce.has(key)) return null;
  mockFiredOnce.add(key);
  // Real SMTP auth rejections quote the username — include it so the tests
  // can prove the server-side log redacts credentials.
  const message = code === 'EAUTH'
    ? `535 5.7.8 <${process.env.SMTP_USER || 'unknown-user'}>: Username and Password not accepted. Learn more at https://support.google.com/mail/answer/6592`
    : '451-4.3.0 Temporary local problem while sending. Please try again later.';
  const err = new Error(message);
  err.code = code;
  err.response = `${code === 'EAUTH' ? '535 5.7.8 Username and Password not accepted' : '451 4.3.0 Temporary local problem'} for ${key}`;
  return err;
};

let transporter;
const getTransporter = () => {
  if (!transporter) {
    const port = Number(process.env.SMTP_PORT || 587);
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: port === 465,
      // Bound the startup verify() (and every send) so an unreachable SMTP
      // host can never hang the server for minutes.
      connectionTimeout: 5000,
      greetingTimeout: 5000,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }
  return transporter;
};

// One-shot SMTP health check, called from server.js before listen().
// Never throws: on failure it logs a single clear warning (credentials
// redacted, never the password) and flags the mailer unhealthy.
export const verifyMailer = async () => {
  try {
    if (process.env.MAILER_MOCK_VERIFY_FAIL) {
      mailerHealthy = false;
      console.warn('[mailer] SMTP not usable: mock verify failure (MAILER_MOCK_VERIFY_FAIL)');
      return;
    }
    // E2E runs must never open a real SMTP connection.
    if (process.env.NODE_ENV === 'test') return;
    if (!isSmtpConfigured()) {
      // development keeps the print-the-code fallback below; production
      // cannot send at all, so flag it immediately.
      if (process.env.NODE_ENV === 'production') {
        mailerHealthy = false;
        console.warn('[mailer] SMTP not usable: SMTP is not configured');
      }
      return;
    }
    await getTransporter().verify();
    mailerHealthy = true;
  } catch (err) {
    mailerHealthy = false;
    const reason = redactMailerSecrets(err?.code ? `${err.code}: ${err.message}` : err?.message);
    console.warn(`[mailer] SMTP not usable: ${reason}`);
  }
};

const buildMail = (email, otp) => ({
  from: process.env.MAIL_FROM,
  to: email,
  subject: 'Your CraftVeda verification code',
  text: [
    'Your CraftVeda verification code',
    '',
    `${otp}`,
    '',
    'This code is valid for 10 minutes.',
    'If you did not request this code, you can safely ignore this email — your password will not change.',
    '',
    '— Team CraftVeda'
  ].join('\n'),
  html: `<!doctype html>
<html>
  <body style="margin:0;padding:0;background-color:#FAF6EF;font-family:Georgia,'Times New Roman',serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#FAF6EF;padding:24px 0;">
      <tr><td align="center">
        <table role="presentation" width="100%" style="max-width:480px;background-color:#FFFFFF;border:1px solid #E9DFCD;border-radius:8px;overflow:hidden;">
          <tr><td style="background-color:#B4553C;padding:20px 28px;">
            <span style="font-size:22px;color:#FFFFFF;">&#127917; CraftVeda</span>
          </td></tr>
          <tr><td style="padding:28px;">
            <h1 style="margin:0 0 8px;font-size:20px;color:#2B1A12;">Your CraftVeda verification code</h1>
            <p style="margin:0 0 20px;font-size:14px;color:#5B4636;font-family:Arial,Helvetica,sans-serif;">
              Enter this code to continue resetting your password.
            </p>
            <p style="margin:0 0 20px;text-align:center;">
              <span style="display:inline-block;font-size:40px;font-weight:bold;letter-spacing:10px;color:#93402A;background-color:#F3E2D8;border:1px dashed #B4553C;border-radius:6px;padding:14px 24px;font-family:Arial,Helvetica,sans-serif;">
                ${otp}
              </span>
            </p>
            <p style="margin:0 0 6px;font-size:14px;color:#5B4636;font-family:Arial,Helvetica,sans-serif;">
              This code is <strong>valid for 10 minutes</strong>.
            </p>
            <p style="margin:0;font-size:13px;color:#7A6553;font-family:Arial,Helvetica,sans-serif;">
              If you did not request this code, you can safely ignore this email &mdash; your password will not change.
            </p>
          </td></tr>
          <tr><td style="background-color:#F2EADC;padding:14px 28px;">
            <p style="margin:0;font-size:12px;color:#7A6553;font-family:Arial,Helvetica,sans-serif;">
              &copy; CraftVeda &mdash; heritage crafts, directly from artisans.
            </p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`
});

// Sends the 6-digit code by email.
//  - SMTP configured: sends it. The OTP is NEVER written to the console here.
//  - SMTP missing + development: prints a clear warning and the OTP to the
//    server console so the flow can be tested locally without SMTP.
//  - SMTP missing + production: throws a uniform 503.
// Any send error is rethrown for the caller to handle; auth/connection
// errors flip mailerHealthy off, a successful send flips it back on.
// Returns true when the email was handed to SMTP.
export const sendOtpEmail = async (email, otp) => {
  const mock = mockSendFailure(email);
  if (mock) {
    if (isConnectionOrAuthError(mock)) mailerHealthy = false;
    throw mock;
  }

  if (!isSmtpConfigured()) {
    if (process.env.NODE_ENV === 'production') {
      mailerHealthy = false;
      throw new ApiError(503, 'Email service is temporarily unavailable. Please try again later.');
    }
    console.warn('[mailer] SMTP is not configured (SMTP_HOST / SMTP_USER / SMTP_PASS / MAIL_FROM are empty).');
    console.warn('[mailer] Not in production — printing the code below so the flow can be tested locally.');
    console.log(`[mailer] OTP for ${email}: ${otp}`);
    mailerHealthy = true; // this mode "sent" the code — healthy by definition
    return false;
  }

  try {
    await getTransporter().sendMail(buildMail(email, otp));
  } catch (err) {
    if (isConnectionOrAuthError(err)) mailerHealthy = false;
    throw err;
  }
  mailerHealthy = true;
  return true;
};

export default sendOtpEmail;
