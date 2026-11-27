import express from 'express';
import { body } from 'express-validator';
import crypto from 'crypto';
import User from '../models/User.js';
import { protect } from '../middleware/auth.js';
import validate from '../middleware/validate.js';
import catchAsync from '../utils/catchAsync.js';
import ApiError from '../utils/ApiError.js';
import jwt from 'jsonwebtoken';
import { verifyGoogleCredential } from '../utils/googleAuth.js';
import {
  forgotPassword,
  verifyOtp,
  resetPassword
} from '../controllers/passwordResetController.js';
import {
  forgotPasswordValidators,
  verifyOtpValidators,
  resetPasswordValidators
} from '../validators/passwordResetValidators.js';
import {
  requireCloudinary,
  handleUpload,
  validateImageFiles,
  uploadImageBuffers,
  destroyImageByUrl,
  PROFILE_FOLDER
} from '../utils/images.js';

const router = express.Router();

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

router.post('/register', [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
], validate, catchAsync(async (req, res) => {
  const { name, email, password } = req.body;
  
  const exists = await User.findOne({ email });
  if (exists) throw new ApiError(400, 'Email already registered');

  const user = await User.create({ 
    name, 
    email, 
    password, 
    role: 'CUSTOMER',
    status: 'ACTIVE'
  });
  
  res.status(201).json({
    success: true,
    token: generateToken(user._id),
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status
    }
  });
}));

router.post('/login', [
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required')
], validate, catchAsync(async (req, res) => {
  const { email, password } = req.body;
  
  const user = await User.findOne({ email });
  if (!user || !(await user.comparePassword(password))) {
    throw new ApiError(401, 'Invalid email or password');
  }

  if (user.status === 'BLOCKED') {
    throw new ApiError(403, 'Account is blocked');
  }

  res.json({
    success: true,
    token: generateToken(user._id),
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status
    }
  });
}));

router.get('/me', protect, catchAsync(async (req, res) => {
  const user = await User.findById(req.user._id).select('-password');
  res.json({ success: true, user });
}));

// Google sign-in: verifies the Google ID token, then issues our own JWT in
// exactly the same shape as /login so the frontend reuses one code path.
// Never creates ADMIN/ARTISAN and never changes an existing user's role.
router.post('/google', [
  body('credential').trim().notEmpty().withMessage('Google credential is required')
], validate, catchAsync(async (req, res) => {
  if (!process.env.GOOGLE_CLIENT_ID?.trim()) {
    throw new ApiError(503, 'Google sign-in is not configured');
  }

  const payload = await verifyGoogleCredential(req.body.credential);

  if (!payload?.email || payload.email_verified !== true) {
    throw new ApiError(401, 'Google account email is not verified');
  }

  const email = String(payload.email).toLowerCase().trim();
  let user = await User.findOne({ email });

  if (user) {
    if (user.status === 'BLOCKED') {
      throw new ApiError(403, 'Account is blocked');
    }
    // Remember the Google id for future logins; role/status are never touched.
    if (!user.googleId && payload.sub) {
      user.googleId = payload.sub;
      await user.save();
    }
  } else {
    // The password field is required by the schema; a long random value makes
    // it unusable — the owner signs in with Google or sets a real one through
    // forgot-password. Role is always CUSTOMER (never ADMIN/ARTISAN here).
    user = await User.create({
      name: payload.name?.trim() || email.split('@')[0],
      email,
      password: crypto.randomBytes(48).toString('base64url'),
      role: 'CUSTOMER',
      status: 'ACTIVE',
      avatar: payload.picture,
      googleId: payload.sub
    });
  }

  res.json({
    success: true,
    token: generateToken(user._id),
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status
    }
  });
}));

// --- Forgot password with email OTP ---------------------------------------
// All three are mounted behind the strict OTP rate limiter in app.js.
router.post('/forgot-password', forgotPasswordValidators, validate, forgotPassword);
router.post('/verify-otp', verifyOtpValidators, validate, verifyOtp);
router.post('/reset-password', resetPasswordValidators, validate, resetPassword);

router.put('/profile', protect, [
  body('name').optional().isString().trim().notEmpty().withMessage('Name cannot be empty'),
  body('phone').optional().isString().trim(),
  body('address').optional().isObject().withMessage('Address must be an object'),
  body('avatar').optional().isString().trim()
], validate, catchAsync(async (req, res) => {
  const { name, phone, address, avatar } = req.body;
  const updates = {};
  if (name !== undefined) updates.name = name;
  if (phone !== undefined) updates.phone = phone;
  if (avatar !== undefined) updates.avatar = avatar;
  if (address !== undefined) {
    updates.address = {
      street: address.street?.trim() || '',
      city: address.city?.trim() || '',
      state: address.state?.trim() || '',
      pincode: address.pincode?.trim() || '',
      country: address.country?.trim() || 'India'
    };
  }

  const user = await User.findByIdAndUpdate(
    req.user._id,
    updates,
    { new: true, runValidators: true }
  ).select('-password');

  res.json({ success: true, user });
}));

router.put('/password', protect, [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters')
], validate, catchAsync(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  const user = await User.findById(req.user._id);
  if (!(await user.comparePassword(currentPassword))) {
    throw new ApiError(400, 'Current password is incorrect');
  }

  user.password = newPassword;
  await user.save();

  res.json({ success: true, message: 'Password updated successfully' });
}));

// Optional avatar for any signed-in user (Cloudinary).
router.post('/avatar', protect, requireCloudinary, handleUpload('avatar', 1),
  catchAsync(async (req, res) => {
    const files = validateImageFiles(req.files);
    if (files.length !== 1) throw new ApiError(400, 'Upload exactly one image');

    const user = await User.findById(req.user._id);
    if (!user) throw new ApiError(401, 'User not found');

    const [uploaded] = await uploadImageBuffers(files, { folder: PROFILE_FOLDER });
    const previous = user.avatar;
    user.avatar = uploaded.secure_url;
    await user.save();

    if (previous && previous !== uploaded.secure_url) {
      await destroyImageByUrl(previous);
    }

    res.json({ success: true, user: { id: user._id, name: user.name, email: user.email, role: user.role, avatar: user.avatar } });
  }));

export default router;
