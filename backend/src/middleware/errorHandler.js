import ApiError from '../utils/ApiError.js';
import { redactMailerSecrets } from '../utils/mailer.js';

const errorHandler = (err, req, res, _next) => {
  let error = { ...err };
  error.message = err.message;

  if (err.name === 'CastError') {
    error = new ApiError(404, 'Resource not found');
  }

  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    error = new ApiError(400, `${field} already exists`);
  }

  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map(val => val.message);
    error = new ApiError(400, messages.join('. '));
  }

  // Intentional messages (ApiError) are safe to send; anything else is an
  // unexpected error whose text may contain internals (SMTP responses, driver
  // messages, stack-derived strings) and must never reach a client in
  // production. The real error is kept on the server console instead.
  const isApiError = err instanceof ApiError || error instanceof ApiError;
  const isProduction = process.env.NODE_ENV === 'production';

  if (isProduction && !isApiError) {
    console.error(
      `[error] ${req.method} ${req.originalUrl} — ${err.name || 'Error'}: ${redactMailerSecrets(err.message)}`
    );
    error = new ApiError(error.statusCode || 500, 'Server Error');
  } else if (!isProduction && !isApiError) {
    // Development: the stack stays in the server console (and in the local
    // response for debugging — the frontend never renders it).
    console.error(`[error] ${req.method} ${req.originalUrl} —`, err.stack || err.message);
  }

  res.status(error.statusCode || 500).json({
    success: false,
    message: error.message || 'Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

export default errorHandler;
