import express from 'express';
import { body } from 'express-validator';
import GITag from '../models/GITag.js';
import { protect, adminOnly } from '../middleware/auth.js';
import validate from '../middleware/validate.js';
import catchAsync from '../utils/catchAsync.js';
import ApiError from '../utils/ApiError.js';

const router = express.Router();

router.get('/admin', protect, adminOnly, catchAsync(async (req, res) => {
  const { page = 1, limit = 20, search } = req.query;
  const query = {};
  if (search) {
    const regex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    query.$or = [{ name: regex }, { type: regex }, { 'location.state': regex }];
  }

  const total = await GITag.countDocuments(query);
  const giTags = await GITag.find(query)
    .sort('name')
    .skip((page - 1) * limit)
    .limit(Number(limit));

  res.json({ success: true, giTags, page: Number(page), pages: Math.ceil(total / limit), total });
}));

router.patch('/:id', protect, adminOnly, [
  body('isActive').optional().isBoolean().withMessage('isActive must be a boolean')
], validate, catchAsync(async (req, res) => {
  if (req.body.isActive === undefined) throw new ApiError(400, 'isActive is required');
  const giTag = await GITag.findByIdAndUpdate(req.params.id, { isActive: req.body.isActive }, { new: true, runValidators: true });
  if (!giTag) throw new ApiError(404, 'GI Tag not found');
  res.json({ success: true, giTag });
}));

router.get('/', catchAsync(async (req, res) => {
  const { page = 1, limit = 12, state, search } = req.query;
  
  const query = { isActive: true };
  
  if (state) query['location.state'] = state;
  if (search) {
    query.$text = { $search: search };
  }

  const total = await GITag.countDocuments(query);
  const giTags = await GITag.find(query)
    .sort('name')
    .skip((page - 1) * limit)
    .limit(Number(limit));

  res.json({
    success: true,
    giTags,
    page: Number(page),
    pages: Math.ceil(total / limit),
    total
  });
}));

router.get('/:id', catchAsync(async (req, res) => {
  const giTag = await GITag.findById(req.params.id)
    .populate('artisans', 'businessName profileImage');
  
  if (!giTag) throw new ApiError(404, 'GI Tag not found');
  
  res.json({ success: true, giTag });
}));

export default router;
