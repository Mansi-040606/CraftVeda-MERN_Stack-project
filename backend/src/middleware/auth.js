import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import ApiError from '../utils/ApiError.js';
import catchAsync from '../utils/catchAsync.js';

export const protect = catchAsync(async (req, res, next) => {
  let token;
  
  if (req.headers.authorization?.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    throw new ApiError(401, 'Not authorized, no token provided');
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select('-password');
    
    if (!req.user) {
      throw new ApiError(401, 'User not found');
    }
    
    next();
  } catch (error) {
    throw new ApiError(401, 'Not authorized, token invalid');
  }
});

export const adminOnly = catchAsync(async (req, res, next) => {
  if (req.user?.role !== 'ADMIN') {
    throw new ApiError(403, 'Admin access required');
  }
  next();
});

export const artisanOnly = catchAsync(async (req, res, next) => {
  if (req.user?.role !== 'ARTISAN' && req.user?.role !== 'ADMIN') {
    throw new ApiError(403, 'Artisan access required');
  }
  next();
});

export const allowRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      throw new ApiError(401, 'Not authorized');
    }
    if (!allowedRoles.includes(req.user.role)) {
      throw new ApiError(403, `Access denied. Allowed roles: ${allowedRoles.join(', ')}`);
    }
    next();
  };
};
