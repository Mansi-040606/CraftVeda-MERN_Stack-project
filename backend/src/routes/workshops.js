import express from 'express';
import { body } from 'express-validator';
import Workshop from '../models/Workshop.js';
import WorkshopBooking from '../models/WorkshopBooking.js';
import { protect, adminOnly } from '../middleware/auth.js';
import validate from '../middleware/validate.js';
import catchAsync from '../utils/catchAsync.js';
import ApiError from '../utils/ApiError.js';

const router = express.Router();

const bookWorkshopValidators = [
  body('scheduleDate')
    .notEmpty().withMessage('Schedule date is required').bail()
    .isISO8601().withMessage('Schedule date must be a valid date'),
  body('participants')
    .notEmpty().withMessage('Participants are required').bail()
    .isInt({ min: 1 }).withMessage('Participants must be an integer greater than or equal to 1')
];

router.get('/', catchAsync(async (req, res) => {
  const { page = 1, limit = 12, craftType, level, location, search } = req.query;
  
  const query = { isActive: true };
  
  if (craftType) query.craftType = craftType;
  if (level) query.level = level;
  if (location) query['location.type'] = location;
  if (search) {
    query.$text = { $search: search };
  }

  const total = await Workshop.countDocuments(query);
  const workshops = await Workshop.find(query)
    .populate('artisan', 'businessName profileImage rating')
    .sort('-createdAt')
    .skip((page - 1) * limit)
    .limit(Number(limit));

  res.json({
    success: true,
    workshops,
    page: Number(page),
    pages: Math.ceil(total / limit),
    total
  });
}));

router.get('/admin', protect, adminOnly, catchAsync(async (req, res) => {
  const { page = 1, limit = 20, search } = req.query;
  const query = {};
  if (search) {
    const regex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    query.$or = [{ title: regex }, { craftType: regex }];
  }

  const total = await Workshop.countDocuments(query);
  const workshops = await Workshop.find(query)
    .populate('artisan', 'businessName profileImage')
    .sort('-createdAt')
    .skip((page - 1) * limit)
    .limit(Number(limit));

  res.json({ success: true, workshops, page: Number(page), pages: Math.ceil(total / limit), total });
}));

router.patch('/:id', protect, adminOnly, [
  body('isActive').optional().isBoolean().withMessage('isActive must be a boolean')
], validate, catchAsync(async (req, res) => {
  if (req.body.isActive === undefined) throw new ApiError(400, 'isActive is required');
  const workshop = await Workshop.findByIdAndUpdate(req.params.id, { isActive: req.body.isActive }, { new: true, runValidators: true });
  if (!workshop) throw new ApiError(404, 'Workshop not found');
  res.json({ success: true, workshop });
}));

router.get('/my-bookings', protect, catchAsync(async (req, res) => {
  const bookings = await WorkshopBooking.find({ user: req.user._id })
    .populate('workshop', 'title images craftType');
  
  res.json({ success: true, bookings });
}));

router.get('/:id', catchAsync(async (req, res) => {
  const workshop = await Workshop.findById(req.params.id)
    .populate('artisan', 'businessName story profileImage rating');
  
  if (!workshop) throw new ApiError(404, 'Workshop not found');
  
  res.json({ success: true, workshop });
}));

router.post('/:id/book', protect, bookWorkshopValidators, validate, catchAsync(async (req, res) => {
  const { scheduleDate, startTime, endTime, participants } = req.body;
  
  const workshop = await Workshop.findById(req.params.id);
  if (!workshop) throw new ApiError(404, 'Workshop not found');
  
  if (workshop.currentParticipants + participants > workshop.maxParticipants) {
    throw new ApiError(400, 'Not enough spots available');
  }

  const amount = workshop.price * participants;
  
  const booking = await WorkshopBooking.create({
    workshop: workshop._id,
    user: req.user._id,
    scheduleDate,
    startTime,
    endTime,
    participants,
    amount
  });

  workshop.currentParticipants += participants;
  await workshop.save();

  res.status(201).json({ success: true, booking });
}));

export default router;
