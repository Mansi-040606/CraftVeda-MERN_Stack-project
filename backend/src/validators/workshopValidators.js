import { body, param, query } from 'express-validator';

const DURATION_UNITS = ['minutes', 'hours', 'days'];
const LEVELS = ['beginner', 'intermediate', 'advanced', 'all'];
const LOCATION_TYPES = ['online', 'offline', 'hybrid'];

// Rules for GET /api/workshops — public, paginated + filterable list.
export const listWorkshopsValidators = [
  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('Page must be an integer of at least 1')
    .toInt(),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 }).withMessage('Limit must be an integer between 1 and 50')
    .toInt(),
  query('craftType')
    .optional()
    .isString().withMessage('Craft type must be a string').bail()
    .trim()
    .notEmpty().withMessage('Craft type cannot be empty'),
  query('level')
    .optional()
    .isIn(LEVELS).withMessage(`Level must be one of: ${LEVELS.join(', ')}`),
  query('location')
    .optional()
    .isIn(LOCATION_TYPES).withMessage(`Location must be one of: ${LOCATION_TYPES.join(', ')}`),
  query('city')
    .optional()
    .isString().withMessage('City must be a string').bail()
    .trim()
    .notEmpty().withMessage('City cannot be empty'),
  query('search')
    .optional()
    .isString().withMessage('Search must be a string').bail()
    .trim()
    .notEmpty().withMessage('Search cannot be empty'),
  query('from')
    .optional()
    .isISO8601().withMessage('From date must be a valid date'),
  query('to')
    .optional()
    .isISO8601().withMessage('To date must be a valid date')
];

// Shared schedule-slot rules (used by create/update).
const scheduleValidators = [
  body('schedule')
    .optional()
    .isArray().withMessage('Schedule must be an array'),
  body('schedule.*.date')
    .notEmpty().withMessage('Schedule date is required').bail()
    .isISO8601().withMessage('Schedule date must be a valid date'),
  body('schedule.*.startTime')
    .notEmpty().withMessage('Start time is required').bail()
    .isString().withMessage('Start time must be a string'),
  body('schedule.*.endTime')
    .notEmpty().withMessage('End time is required').bail()
    .isString().withMessage('End time must be a string')
];

const materialValidators = [
  body('materials')
    .optional()
    .isArray().withMessage('Materials must be an array'),
  body('materials.*.name')
    .notEmpty().withMessage('Material name is required').bail()
    .isString().withMessage('Material name must be a string'),
  body('materials.*.description')
    .optional()
    .isString().withMessage('Material description must be a string')
];

// Rules for POST /api/workshops/mine — artisan creates a workshop.
export const createWorkshopValidators = [
  body('title')
    .notEmpty().withMessage('Title is required').bail()
    .isString().withMessage('Title must be a string').bail()
    .trim()
    .isLength({ min: 3 }).withMessage('Title must be at least 3 characters'),
  body('description')
    .notEmpty().withMessage('Description is required').bail()
    .isString().withMessage('Description must be a string')
    .trim(),
  body('craftType')
    .notEmpty().withMessage('Craft type is required').bail()
    .isString().withMessage('Craft type must be a string')
    .trim(),
  body('duration')
    .notEmpty().withMessage('Duration is required').bail()
    .isInt({ min: 1 }).withMessage('Duration must be an integer of at least 1').toInt(),
  body('durationUnit')
    .optional()
    .isIn(DURATION_UNITS).withMessage(`Duration unit must be one of: ${DURATION_UNITS.join(', ')}`),
  body('maxParticipants')
    .notEmpty().withMessage('Max participants is required').bail()
    .isInt({ min: 1 }).withMessage('Max participants must be an integer of at least 1').toInt(),
  body('price')
    .notEmpty().withMessage('Price is required').bail()
    .isFloat({ min: 0 }).withMessage('Price must be a number of 0 or more').toFloat(),
  body('level')
    .optional()
    .isIn(LEVELS).withMessage(`Level must be one of: ${LEVELS.join(', ')}`),
  body('language')
    .optional()
    .isString().withMessage('Language must be a string').bail()
    .trim()
    .notEmpty().withMessage('Language cannot be empty'),
  body('images')
    .optional()
    .isArray().withMessage('Images must be an array'),
  body('images.*')
    .isString().withMessage('Images must contain only strings'),
  body('videoUrl')
    .optional()
    .isString().withMessage('Video URL must be a string'),
  body('location')
    .optional()
    .isObject().withMessage('Location must be an object'),
  body('location.type')
    .optional()
    .isIn(LOCATION_TYPES).withMessage(`Location type must be one of: ${LOCATION_TYPES.join(', ')}`),
  body('location.address')
    .optional()
    .isString().withMessage('Location address must be a string'),
  body('location.city')
    .optional()
    .isString().withMessage('Location city must be a string'),
  body('location.state')
    .optional()
    .isString().withMessage('Location state must be a string'),
  ...scheduleValidators,
  ...materialValidators
];

// Rules for PUT /api/workshops/mine/:id — every field optional (partial update).
export const updateWorkshopValidators = [
  param('id').isMongoId().withMessage('Workshop id must be a valid id'),
  body('title')
    .optional()
    .isString().withMessage('Title must be a string').bail()
    .trim()
    .isLength({ min: 3 }).withMessage('Title must be at least 3 characters'),
  body('description')
    .optional()
    .isString().withMessage('Description must be a string')
    .trim(),
  body('craftType')
    .optional()
    .isString().withMessage('Craft type must be a string').bail()
    .trim()
    .notEmpty().withMessage('Craft type cannot be empty'),
  body('duration')
    .optional()
    .isInt({ min: 1 }).withMessage('Duration must be an integer of at least 1').toInt(),
  body('durationUnit')
    .optional()
    .isIn(DURATION_UNITS).withMessage(`Duration unit must be one of: ${DURATION_UNITS.join(', ')}`),
  body('maxParticipants')
    .optional()
    .isInt({ min: 1 }).withMessage('Max participants must be an integer of at least 1').toInt(),
  body('price')
    .optional()
    .isFloat({ min: 0 }).withMessage('Price must be a number of 0 or more').toFloat(),
  body('level')
    .optional()
    .isIn(LEVELS).withMessage(`Level must be one of: ${LEVELS.join(', ')}`),
  body('language')
    .optional()
    .isString().withMessage('Language must be a string').bail()
    .trim()
    .notEmpty().withMessage('Language cannot be empty'),
  body('images')
    .optional()
    .isArray().withMessage('Images must be an array'),
  body('images.*')
    .isString().withMessage('Images must contain only strings'),
  body('videoUrl')
    .optional()
    .isString().withMessage('Video URL must be a string'),
  body('location')
    .optional()
    .isObject().withMessage('Location must be an object'),
  body('location.type')
    .optional()
    .isIn(LOCATION_TYPES).withMessage(`Location type must be one of: ${LOCATION_TYPES.join(', ')}`),
  body('location.address')
    .optional()
    .isString().withMessage('Location address must be a string'),
  body('location.city')
    .optional()
    .isString().withMessage('Location city must be a string'),
  body('location.state')
    .optional()
    .isString().withMessage('Location state must be a string'),
  body('isActive')
    .optional()
    .isBoolean().withMessage('isActive must be a boolean').toBoolean(),
  ...scheduleValidators,
  ...materialValidators
];

// Rules for POST /api/workshops/:id/book — a customer books seats.
export const bookWorkshopValidators = [
  param('id').isMongoId().withMessage('Workshop id must be a valid id'),
  body('scheduleDate')
    .notEmpty().withMessage('Schedule date is required').bail()
    .isISO8601().withMessage('Schedule date must be a valid date'),
  body('participants')
    .notEmpty().withMessage('Participants are required').bail()
    .isInt({ min: 1 }).withMessage('Participants must be an integer of at least 1').toInt(),
  body('startTime')
    .optional()
    .isString().withMessage('Start time must be a string').bail()
    .trim()
    .notEmpty().withMessage('Start time cannot be empty'),
  body('endTime')
    .optional()
    .isString().withMessage('End time must be a string').bail()
    .trim()
    .notEmpty().withMessage('End time cannot be empty')
];

// Rules for any route with a single workshop id in the path.
export const idParamValidators = [
  param('id').isMongoId().withMessage('Workshop id must be a valid id')
];
