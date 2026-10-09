import express from 'express';
import CraftStory from '../models/CraftStory.js';
import { protect, adminOnly } from '../middleware/auth.js';
import catchAsync from '../utils/catchAsync.js';
import ApiError from '../utils/ApiError.js';

const router = express.Router();

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

router.post('/', protect, adminOnly, catchAsync(async (req, res) => {
  const story = await CraftStory.create(req.body);
  res.status(201).json({ success: true, story });
}));

router.put('/:id', protect, adminOnly, catchAsync(async (req, res) => {
  const story = await CraftStory.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!story) throw new ApiError(404, 'Story not found');
  res.json({ success: true, story });
}));

router.delete('/:id', protect, adminOnly, catchAsync(async (req, res) => {
  const story = await CraftStory.findByIdAndDelete(req.params.id);
  if (!story) throw new ApiError(404, 'Story not found');
  res.json({ success: true, message: 'Story deleted' });
}));

export default router;
