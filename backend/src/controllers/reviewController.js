import mongoose from 'mongoose';
import Review from '../models/Review.js';
import Product from '../models/Product.js';
import Artisan from '../models/Artisan.js';
import Order from '../models/Order.js';
import catchAsync from '../utils/catchAsync.js';
import ApiError from '../utils/ApiError.js';

const round2 = (value) => Math.round(value * 100) / 100;

// Recalculate the product's approved-review average + count from the reviews
// themselves (never by incrementing, so hide/approve stays consistent).
export const recalcProductRating = async (productId) => {
  if (!productId) return;
  const id = new mongoose.Types.ObjectId(String(productId));
  const [agg] = await Review.aggregate([
    { $match: { product: id, isApproved: true } },
    { $group: { _id: '$product', average: { $avg: '$rating' }, count: { $sum: 1 } } }
  ]);

  await Product.updateOne(
    { _id: id },
    { $set: { averageRating: agg ? round2(agg.average) : 0, reviewCount: agg ? agg.count : 0 } }
  );
};

// Same for the artisan behind those reviews (reviews carry a derived `artisan`).
export const recalcArtisanRating = async (artisanId) => {
  if (!artisanId) return;
  const id = new mongoose.Types.ObjectId(String(artisanId));
  const [agg] = await Review.aggregate([
    { $match: { artisan: id, isApproved: true } },
    { $group: { _id: '$artisan', average: { $avg: '$rating' }, count: { $sum: 1 } } }
  ]);

  await Artisan.updateOne(
    { _id: id },
    { $set: { rating: agg ? round2(agg.average) : 0, reviewCount: agg ? agg.count : 0 } }
  );
};

// The single source of truth for "may this user review this product?".
// Used by POST / and by GET /product/:id/can-review so both always agree.
const evaluateReviewability = async (userId, product) => {
  const ownProfile = await Artisan.findOne({ user: userId }).select('_id');
  if (ownProfile && product.artisan.equals(ownProfile._id)) {
    return { allowed: false, reason: 'You cannot review your own product' };
  }

  const existing = await Review.findOne({ user: userId, product: product._id }).select('_id');
  if (existing) {
    return {
      allowed: false,
      alreadyReviewed: true,
      reason: 'You have already reviewed this product'
    };
  }

  const received = await Order.exists({
    user: userId,
    orderStatus: 'delivered',
    'items.product': product._id
  });
  if (!received) {
    return {
      allowed: false,
      reason: 'You can review this product once your order for it has been delivered'
    };
  }

  return { allowed: true };
};

// GET /api/reviews — admin list.
export const listReviews = catchAsync(async (req, res) => {
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
});

// PATCH /api/reviews/:id — admin approve / hide, then resync aggregates.
export const moderateReview = catchAsync(async (req, res) => {
  const review = await Review.findById(req.params.id);
  if (!review) throw new ApiError(404, 'Review not found');

  review.isApproved = req.body.isApproved;
  await review.save();

  if (review.product) await recalcProductRating(review.product);
  if (review.artisan) await recalcArtisanRating(review.artisan);

  res.json({ success: true, review });
});

// GET /api/reviews/product/:productId — public, approved reviews only.
export const listProductReviews = catchAsync(async (req, res) => {
  const reviews = await Review.find({ product: req.params.productId, isApproved: true })
    .populate('user', 'name avatar')
    .sort('-createdAt');

  const averageRating = reviews.length
    ? round2(reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length)
    : 0;

  res.json({ success: true, reviews, averageRating, total: reviews.length });
});

// GET /api/reviews/artisan/:artisanId — public, approved reviews only.
export const listArtisanReviews = catchAsync(async (req, res) => {
  const reviews = await Review.find({ artisan: req.params.artisanId, isApproved: true })
    .populate('user', 'name avatar')
    .sort('-createdAt');

  const averageRating = reviews.length
    ? round2(reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length)
    : 0;

  res.json({ success: true, reviews, averageRating, total: reviews.length });
});

// GET /api/reviews/product/:productId/can-review — tells the UI whether to
// show the "Write a review" form (and why not, when it may not).
export const checkCanReview = catchAsync(async (req, res) => {
  const product = await Product.findById(req.params.productId).select('_id artisan');
  if (!product) throw new ApiError(404, 'Product not found');

  const result = await evaluateReviewability(req.user._id, product);
  res.json({ success: true, ...result });
});

// POST /api/reviews — create a product review.
export const createReview = catchAsync(async (req, res) => {
  const { product: productId, rating, title, comment, images } = req.body;

  const product = await Product.findById(productId).select('_id name artisan');
  if (!product) throw new ApiError(404, 'Product not found');

  const result = await evaluateReviewability(req.user._id, product);
  if (!result.allowed) {
    throw new ApiError(result.alreadyReviewed ? 409 : 403, result.reason);
  }

  let review;
  try {
    review = await Review.create({
      user: req.user._id,
      product: product._id,
      // Derived from the product — never taken from the request body.
      artisan: product.artisan,
      rating,
      title,
      comment,
      images,
      isVerifiedPurchase: true
    });
  } catch (err) {
    // Unique (user, product) index — the race-window twin of the duplicate guard.
    if (err?.code === 11000) {
      throw new ApiError(409, 'You have already reviewed this product');
    }
    throw err;
  }

  await recalcProductRating(product._id);
  await recalcArtisanRating(product.artisan);

  res.status(201).json({ success: true, review });
});

// PUT /api/reviews/:id/helpful — one vote per user ($addToSet).
export const markHelpful = catchAsync(async (req, res) => {
  const review = await Review.findByIdAndUpdate(
    req.params.id,
    { $addToSet: { helpfulBy: req.user._id } },
    { new: true }
  );
  if (!review) throw new ApiError(404, 'Review not found');

  review.helpful = review.helpfulBy.length;
  await review.save();

  res.json({ success: true, review });
});
