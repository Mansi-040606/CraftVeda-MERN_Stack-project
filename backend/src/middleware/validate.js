import { validationResult } from 'express-validator';

const validate = (req, res, next) => {
  const errors = validationResult(req);

  if (errors.isEmpty()) {
    return next();
  }

  res.status(400).json({
    success: false,
    message: 'Validation failed',
    errors: errors.array()
  });
};

export default validate;
