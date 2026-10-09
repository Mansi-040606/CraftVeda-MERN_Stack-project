import express from 'express';
import { protect, allowRoles } from '../middleware/auth.js';
import validate from '../middleware/validate.js';
import {
  wishlistProductIdValidators,
  moveToCartValidators
} from '../validators/wishlistValidators.js';
import {
  getWishlist,
  addToWishlist,
  removeFromWishlist,
  moveToCart
} from '../controllers/wishlistController.js';

const router = express.Router();

// Wishlist is only for shoppers: customers and artisans (admins do not shop).
router.use(protect, allowRoles('CUSTOMER', 'ARTISAN'));

router.get('/', getWishlist);
router.post('/:productId', wishlistProductIdValidators, validate, addToWishlist);
router.delete('/:productId', wishlistProductIdValidators, validate, removeFromWishlist);
router.post('/:productId/move-to-cart', moveToCartValidators, validate, moveToCart);

export default router;
