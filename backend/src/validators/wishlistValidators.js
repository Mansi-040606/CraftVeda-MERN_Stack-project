import { body, param } from 'express-validator';

// Rules for routes that only carry a :productId parameter.
export const wishlistProductIdValidators = [
  param('productId')
    .isMongoId().withMessage('Product id must be a valid id')
];

// Rules for POST /api/wishlist/:productId/move-to-cart.
export const moveToCartValidators = [
  param('productId')
    .isMongoId().withMessage('Product id must be a valid id'),
  body('quantity')
    .optional()
    .isInt({ min: 1 }).withMessage('Quantity must be an integer of at least 1')
    .toInt()
];
