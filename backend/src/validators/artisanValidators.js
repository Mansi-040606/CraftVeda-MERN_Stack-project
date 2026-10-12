import { query } from 'express-validator';

const ORDER_STATUSES = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];

// Rules for GET /api/artisans/me/orders — paginated list of orders that
// contain this artisan's products.
export const myOrdersQueryValidators = [
  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('Page must be an integer of at least 1')
    .toInt(),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 }).withMessage('Limit must be an integer between 1 and 50')
    .toInt(),
  query('orderStatus')
    .optional()
    .isIn(ORDER_STATUSES).withMessage(`Order status must be one of: ${ORDER_STATUSES.join(', ')}`)
];
