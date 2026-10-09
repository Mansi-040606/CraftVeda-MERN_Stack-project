import express from 'express';
import { body } from 'express-validator';
import Artisan from '../models/Artisan.js';
import Product from '../models/Product.js';
import User from '../models/User.js';
import { protect, allowRoles } from '../middleware/auth.js';
import validate from '../middleware/validate.js';
import catchAsync from '../utils/catchAsync.js';
import ApiError from '../utils/ApiError.js';

const router = express.Router();

const createArtisanValidators = [
  body('businessName')
    .notEmpty().withMessage('Business name is required').bail()
    .isString().withMessage('Business name must be a string').bail()
    .trim()
    .isLength({ min: 2 }).withMessage('Business name must be at least 2 characters'),
  body('description')
    .notEmpty().withMessage('Description is required').bail()
    .isString().withMessage('Description must be a string')
    .trim(),
  body('craftTypes')
    .notEmpty().withMessage('Craft types are required').bail()
    .isArray({ min: 1 }).withMessage('Craft types must be a non-empty array'),
  body('craftTypes.*')
    .isString().withMessage('Craft types must contain only strings').bail()
    .trim()
    .notEmpty().withMessage('Craft types cannot contain empty values'),
  body('user')
    .optional()
    .isMongoId().withMessage('User must be a valid id')
];

router.get('/', catchAsync(async (req, res) => {
  const { page = 1, limit = 12, city, state, craftType, search, sort = '-createdAt' } = req.query;
  
  const query = { isVerified: true };
  
  if (city) query['location.city'] = new RegExp(city, 'i');
  if (state) query['location.state'] = new RegExp(state, 'i');
  if (craftType) query.craftTypes = craftType;
  if (search) {
    query.$or = [
      { businessName: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } }
    ];
  }

  const total = await Artisan.countDocuments(query);
  const artisans = await Artisan.find(query)
    .populate('user', 'name email avatar')
    .sort(sort)
    .skip((page - 1) * limit)
    .limit(Number(limit));

  res.json({
    success: true,
    artisans,
    page: Number(page),
    pages: Math.ceil(total / limit),
    total
  });
}));

router.get('/:id', catchAsync(async (req, res) => {
  const artisan = await Artisan.findById(req.params.id)
    .populate('user', 'name email avatar phone');
  
  if (!artisan) throw new ApiError(404, 'Artisan not found');
  
  res.json({ success: true, artisan });
}));

router.get('/:id/products', catchAsync(async (req, res) => {
  const products = await Product.find({ artisan: req.params.id, isActive: true });
  res.json({ success: true, products });
}));

router.post('/', protect, allowRoles('ARTISAN', 'ADMIN'), createArtisanValidators, validate, catchAsync(async (req, res) => {
  const body = { ...req.body };

  if (req.user.role === 'ADMIN') {
    if (!body.user) throw new ApiError(400, 'User id is required');
    const userExists = await User.findById(body.user);
    if (!userExists) throw new ApiError(404, 'User not found');
    const existingForUser = await Artisan.findOne({ user: body.user });
    if (existingForUser) throw new ApiError(400, 'This user already has an artisan profile');
  } else {
    // An artisan profile always belongs to the logged-in user.
    const existingForUser = await Artisan.findOne({ user: req.user._id });
    if (existingForUser) throw new ApiError(400, 'You already have an artisan profile');
    body.user = req.user._id;
  }

  const artisan = await Artisan.create(body);
  res.status(201).json({ success: true, artisan });
}));

router.put('/:id', protect, allowRoles('ARTISAN', 'ADMIN'), catchAsync(async (req, res) => {
  const artisan = await Artisan.findById(req.params.id);
  if (!artisan) throw new ApiError(404, 'Artisan not found');

  // Artisans may only edit their own profile; admins may edit any profile.
  const isOwner = artisan.user.equals(req.user._id);
  if (req.user.role !== 'ADMIN' && !isOwner) {
    throw new ApiError(403, 'You can only edit your own profile');
  }

  const updates = { ...req.body };
  // A profile can never be transferred to another user.
  delete updates.user;

  const updated = await Artisan.findByIdAndUpdate(artisan._id, updates, { new: true, runValidators: true });
  res.json({ success: true, artisan: updated });
}));

export default router;
