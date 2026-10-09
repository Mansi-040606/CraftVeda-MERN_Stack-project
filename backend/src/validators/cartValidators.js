import { body, param } from 'express-validator';

// Rules for POST /api/cart — add an item to the cart.
export const addToCartValidators = [
  body('productId')
    .notEmpty().withMessage('Product id is required').bail()
    .isMongoId().withMessage('Product id must be a valid id'),
  body('quantity')
    .notEmpty().withMessage('Quantity is required').bail()
    .isInt({ min: 1 }).withMessage('Quantity must be an integer of at least 1')
    .toInt()
];

// Rules for PUT /api/cart/:productId — set the quantity.
// Quantity 0 or less removes the item, so negatives are allowed here.
export const setCartQuantityValidators = [
  param('productId')
    .isMongoId().withMessage('Product id must be a valid id'),
  body('quantity')
    .notEmpty().withMessage('Quantity is required').bail()
    .isInt().withMessage('Quantity must be an integer')
    .toInt()
];

// Rules for routes that only carry a :productId parameter.
export const productIdParamValidators = [
  param('productId')
    .isMongoId().withMessage('Product id must be a valid id')
];
