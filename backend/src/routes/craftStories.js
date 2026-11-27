import express from 'express';
import { body } from 'express-validator';
import CraftStory from '../models/CraftStory.js';
import { protect, adminOnly } from '../middleware/auth.js';
import validate from '../middleware/validate.js';
import catchAsync from '../utils/catchAsync.js';
import ApiError from '../utils/ApiError.js';

const router = express.Router();
const CATEGORIES = ['history', 'technique', 'artisan-story', 'heritage', 'preservation', 'other'];

const slugify = (text) =>
  String(text || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const pickStoryFields = (bodyData) => {
  const allowed = [
    'title', 'slug', 'content', 'excerpt', 'coverImage',
    'category', 'craftType', 'region', 'featured', 'publishedAt',
    'tags', 'readTime'
  ];
  const out = {};
  for (const key of allowed) {
    if (bodyData[key] !== undefined) out[key] = bodyData[key];
  }
  return out;
};

const createValidators = [
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('content').trim().notEmpty().withMessage('Content is required'),
  body('slug').optional().isString().trim(),
  body('excerpt').optional().isString().trim().isLength({ max: 300 }).withMessage('Excerpt must be 300 characters or fewer'),
  body('category').optional().isIn(CATEGORIES).withMessage(`Category must be one of: ${CATEGORIES.join(', ')}`),
  body('featured').optional().isBoolean(),
  body('readTime').optional().isInt({ min: 1 }).withMessage('Read time must be at least 1 minute')
];

const updateValidators = [
  body('title').optional().isString().trim().notEmpty().withMessage('Title cannot be empty'),
  body('content').optional().isString().trim().notEmpty().withMessage('Content cannot be empty'),
  body('slug').optional().isString().trim().notEmpty().withMessage('Slug cannot be empty'),
  body('excerpt').optional().isString().trim().isLength({ max: 300 }).withMessage('Excerpt must be 300 characters or fewer'),
  body('category').optional().isIn(CATEGORIES).withMessage(`Category must be one of: ${CATEGORIES.join(', ')}`),
  body('featured').optional().isBoolean(),
  body('readTime').optional().isInt({ min: 1 }).withMessage('Read time must be at least 1 minute')
];

router.get('/', catchAsync(async (req, res) => {
  const { page = 1, limit = 10, category, featured } = req.query;
  
  const query = {};
  if (category) query.category = category;
  if (featured === 'true') query.featured = true;

  const total = await CraftStory.countDocuments(query);
  const stories = await CraftStory.find(query)
    .sort('-createdAt')
    .skip((page - 1) * limit)
    .limit(Number(limit));

  res.json({
    success: true,
    stories,
    page: Number(page),
    pages: Math.ceil(total / limit),
    total
  });
}));

router.get('/:slug', catchAsync(async (req, res) => {
  const story = await CraftStory.findOne({ slug: req.params.slug });
  
  if (!story) throw new ApiError(404, 'Story not found');
  
  res.json({ success: true, story });
}));

router.post('/', protect, adminOnly, createValidators, validate, catchAsync(async (req, res) => {
  const payload = pickStoryFields(req.body);
  const baseSlug = slugify(payload.slug || payload.title) || `story-${Date.now()}`;
  const collision = await CraftStory.exists({ slug: baseSlug });
  payload.slug = collision ? `${baseSlug}-${Date.now().toString(36)}` : baseSlug;
  payload.author = req.user._id;
  if (!payload.publishedAt) payload.publishedAt = new Date();

  const story = await CraftStory.create(payload);
  res.status(201).json({ success: true, story });
}));

router.put('/:id', protect, adminOnly, updateValidators, validate, catchAsync(async (req, res) => {
  const payload = pickStoryFields(req.body);
  if (payload.slug) payload.slug = slugify(payload.slug);
  const story = await CraftStory.findByIdAndUpdate(req.params.id, payload, { new: true, runValidators: true });
  if (!story) throw new ApiError(404, 'Story not found');
  res.json({ success: true, story });
}));

router.delete('/:id', protect, adminOnly, catchAsync(async (req, res) => {
  const story = await CraftStory.findByIdAndDelete(req.params.id);
  if (!story) throw new ApiError(404, 'Story not found');
  res.json({ success: true, message: 'Story deleted' });
}));

export default router;
