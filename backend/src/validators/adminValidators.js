import { query } from 'express-validator';

// Rules for GET /api/admin/stats/timeseries — ?months=N (1..24, default 6).
export const timeSeriesValidators = [
  query('months')
    .optional()
    .isInt({ min: 1, max: 24 }).withMessage('Months must be an integer between 1 and 24')
    .toInt()
];
