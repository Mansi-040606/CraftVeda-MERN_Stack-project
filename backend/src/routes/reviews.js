import express from 'express';
import { protect, adminOnly } from '../middleware/auth.js';
import validate from '../middleware/validate.js';
import {
  createReviewValidators,
  productIdParamValidators,
  artisanIdParamValidators,
  moderateReviewValidators
} from '../validators/reviewValidators.js';
import {
  listReviews,
  moderateReview,
  listProductReviews,
  listArtisanReviews,
  checkCanReview,
  createReview,
  markHelpful
} from '../controllers/reviewController.js';

const router = express.Router();

// Admin: list + approve/hide.
router.get('/', protect, adminOnly, listReviews);
router.patch('/:id', protect, adminOnly, moderateReviewValidators, validate, moderateReview);

// Public: approved reviews for a product / an artisan.
router.get('/product/:productId', productIdParamValidators, validate, listProductReviews);
router.get('/product/:productId/can-review', protect, productIdParamValidators, validate, checkCanReview);
router.get('/artisan/:artisanId', artisanIdParamValidators, validate, listArtisanReviews);

// Logged-in users.
router.post('/', protect, createReviewValidators, validate, createReview);
router.put('/:id/helpful', protect, markHelpful);

export default router;
