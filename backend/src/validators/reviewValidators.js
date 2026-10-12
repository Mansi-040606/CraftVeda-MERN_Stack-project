import { body, param } from 'express-validator';

// Rules for POST /api/reviews — create a product review.
export const createReviewValidators = [
  body('product')
    .notEmpty().withMessage('Product id is required').bail()
    .isMongoId().withMessage('Product id must be a valid id'),
  body('rating')
    .notEmpty().withMessage('Rating is required').bail()
    .isInt({ min: 1, max: 5 }).withMessage('Rating must be a whole number from 1 to 5')
    .toInt(),
  body('comment')
    .notEmpty().withMessage('Comment is required').bail()
    .isString().withMessage('Comment must be a string').bail()
    .trim()
    .isLength({ min: 5, max: 1000 }).withMessage('Comment must be between 5 and 1000 characters'),
  body('title')
    .optional({ values: 'falsy' })
    .isString().withMessage('Title must be a string').bail()
    .trim()
    .isLength({ max: 100 }).withMessage('Title cannot be longer than 100 characters'),
  body('images')
    .optional()
    .isArray().withMessage('Images must be an array'),
  body('images.*')
    .isString().withMessage('Images must contain only string urls'),
  // The owning artisan and the workshop are decided by the server, never the client.
  body('artisan')
    .optional()
    .custom(() => false).withMessage('Artisan is set by the server and cannot be sent'),
  body('workshop')
    .optional()
    .custom(() => false).withMessage('Workshop reviews are not supported')
];

// Rules for routes that carry a :productId parameter.
export const productIdParamValidators = [
  param('productId')
    .isMongoId().withMessage('Product id must be a valid id')
];

// Rules for routes that carry an :artisanId parameter.
export const artisanIdParamValidators = [
  param('artisanId')
    .isMongoId().withMessage('Artisan id must be a valid id')
];

// Rules for PATCH /api/reviews/:id — admin approve / hide.
export const moderateReviewValidators = [
  body('isApproved')
    .notEmpty().withMessage('isApproved is required').bail()
    .isBoolean().withMessage('isApproved must be a boolean')
    .toBoolean()
];
