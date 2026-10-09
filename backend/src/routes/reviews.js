import express from 'express';
import { body } from 'express-validator';
import Review from '../models/Review.js';
import { protect, adminOnly } from '../middleware/auth.js';
import validate from '../middleware/validate.js';
import catchAsync from '../utils/catchAsync.js';
import ApiError from '../utils/ApiError.js';

const router = express.Router();

router.get('/', protect, adminOnly, catchAsync(async (req, res) => {
  const { page = 1, limit = 20, isApproved } = req.query;
  const query = {};
  if (isApproved !== undefined && isApproved !== '') query.isApproved = isApproved === 'true';

  const total = await Review.countDocuments(query);
  const reviews = await Review.find(query)
    .populate('user', 'name email')
    .populate('product', 'name')
    .populate('artisan', 'businessName')
    .sort('-createdAt')
    .skip((page - 1) * limit)
    .limit(Number(limit));

  res.json({ success: true, reviews, page: Number(page), pages: Math.ceil(total / limit), total });
}));

router.patch('/:id', protect, adminOnly, [
  body('isApproved').isBoolean().withMessage('isApproved must be a boolean')
], validate, catchAsync(async (req, res) => {
  const review = await Review.findByIdAndUpdate(req.params.id, { isApproved: req.body.isApproved }, { new: true, runValidators: true });
  if (!review) throw new ApiError(404, 'Review not found');
  res.json({ success: true, review });
}));

router.get('/product/:productId', catchAsync(async (req, res) => {
  const reviews = await Review.find({ product: req.params.productId, isApproved: true })
    .populate('user', 'name avatar')
    .sort('-createdAt');
  
  const avgRating = reviews.length 
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length 
    : 0;

  res.json({ success: true, reviews, averageRating: avgRating, total: reviews.length });
}));

router.get('/artisan/:artisanId', catchAsync(async (req, res) => {
  const reviews = await Review.find({ artisan: req.params.artisanId, isApproved: true })
    .populate('user', 'name avatar')
    .sort('-createdAt');
  
  res.json({ success: true, reviews });
}));

router.post('/', protect, catchAsync(async (req, res) => {
  const { product, workshop, artisan, rating, title, comment, images } = req.body;
  
  if (!product && !workshop && !artisan) {
    throw new ApiError(400, 'Must provide product, workshop, or artisan');
  }

  const review = await Review.create({
    user: req.user._id,
    product,
    workshop,
    artisan,
    rating,
    title,
    comment,
    images
  });

  res.status(201).json({ success: true, review });
}));

router.put('/:id/helpful', protect, catchAsync(async (req, res) => {
  const review = await Review.findByIdAndUpdate(
    req.params.id,
    { $addToSet: { helpfulBy: req.user._id } },
    { new: true }
  );
  if (!review) throw new ApiError(404, 'Review not found');

  review.helpful = review.helpfulBy.length;
  await review.save();

  res.json({ success: true, review });
}));

export default router;
