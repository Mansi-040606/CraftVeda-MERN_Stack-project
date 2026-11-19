import express from 'express';
import { body } from 'express-validator';
import User from '../models/User.js';
import { protect } from '../middleware/auth.js';
import validate from '../middleware/validate.js';
import catchAsync from '../utils/catchAsync.js';
import ApiError from '../utils/ApiError.js';
import jwt from 'jsonwebtoken';
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

router.put('/profile', protect, catchAsync(async (req, res) => {
  const { name, phone, address, avatar } = req.body;
  const user = await User.findByIdAndUpdate(
    req.user._id,
    { name, phone, address, avatar },
    { new: true, runValidators: true }
  ).select('-password');
  
  res.json({ success: true, user });
}));

router.put('/password', protect, catchAsync(async (req, res) => {
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
