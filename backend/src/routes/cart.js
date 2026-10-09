import express from 'express';
import { protect, allowRoles } from '../middleware/auth.js';
import validate from '../middleware/validate.js';
import {
  addToCartValidators,
  setCartQuantityValidators,
  productIdParamValidators
} from '../validators/cartValidators.js';
import {
  getCart,
  addToCart,
  setCartQuantity,
  removeCartItem,
  clearCart
} from '../controllers/cartController.js';

const router = express.Router();

// Cart is only for shoppers: customers and artisans (admins do not shop).
router.use(protect, allowRoles('CUSTOMER', 'ARTISAN'));

router.get('/', getCart);
router.post('/', addToCartValidators, validate, addToCart);
router.put('/:productId', setCartQuantityValidators, validate, setCartQuantity);
router.delete('/:productId', productIdParamValidators, validate, removeCartItem);
router.delete('/', clearCart);

export default router;
