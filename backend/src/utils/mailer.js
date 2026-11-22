import nodemailer from 'nodemailer';
import ApiError from './ApiError.js';

// Reads the SMTP_* variables from process.env only and never logs them.
export const isSmtpConfigured = () =>
  Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS && process.env.MAIL_FROM);

let transporter;
const getTransporter = () => {
  if (!transporter) {
    const port = Number(process.env.SMTP_PORT || 587);
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: port === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }
  return transporter;
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
//  - SMTP missing + production: throws 503.
// Returns true when the email was handed to SMTP.
export const sendOtpEmail = async (email, otp) => {
  if (!isSmtpConfigured()) {
    if (process.env.NODE_ENV === 'production') {
      throw new ApiError(503, 'Email service is not configured');
    }
    console.warn('[mailer] SMTP is not configured (SMTP_HOST / SMTP_USER / SMTP_PASS / MAIL_FROM are empty).');
    console.warn('[mailer] Not in production — printing the code below so the flow can be tested locally.');
    console.log(`[mailer] OTP for ${email}: ${otp}`);
    return false;
  }

  await getTransporter().sendMail(buildMail(email, otp));
  return true;
};

export default sendOtpEmail;
