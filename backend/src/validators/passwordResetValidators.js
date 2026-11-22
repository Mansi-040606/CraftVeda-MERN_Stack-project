import { body } from 'express-validator';

// Rules for POST /api/auth/forgot-password — { email }.
// The endpoint answers with the same generic message for every email, so the
// validators only shape the request, never reveal whether the account exists.
// No normalizeEmail(): it would strip dots from Gmail addresses and break the
// lookup for anyone who registered with "first.last@gmail.com".
export const forgotPasswordValidators = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required').bail()
    .isEmail().withMessage('Valid email is required')
];

// Rules for POST /api/auth/verify-otp — { email, otp }.
export const verifyOtpValidators = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required').bail()
    .isEmail().withMessage('Valid email is required'),
  body('otp')
    .trim()
    .notEmpty().withMessage('Verification code is required').bail()
    .isLength({ min: 6, max: 6 }).withMessage('Verification code must be 6 digits').bail()
    .isNumeric().withMessage('Verification code must be 6 digits')
];

// Rules for POST /api/auth/reset-password — { email, resetToken, newPassword }.
// Password strength matches register (min 6) so both flows accept the same set.
export const resetPasswordValidators = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required').bail()
    .isEmail().withMessage('Valid email is required'),
  body('resetToken')
    .trim()
    .notEmpty().withMessage('Reset token is required').bail()
    .isLength({ min: 32, max: 128 }).withMessage('Reset token is invalid'),
  body('newPassword')
    .notEmpty().withMessage('Password is required').bail()
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
];
