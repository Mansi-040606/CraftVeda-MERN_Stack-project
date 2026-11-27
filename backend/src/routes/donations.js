import express from 'express';
import { body } from 'express-validator';
import Donation from '../models/Donation.js';
import { protect, adminOnly } from '../middleware/auth.js';
import validate from '../middleware/validate.js';
import catchAsync from '../utils/catchAsync.js';
import ApiError from '../utils/ApiError.js';

const router = express.Router();
const DONATION_STATUSES = ['pending', 'completed', 'failed', 'refunded'];

router.get('/all', protect, adminOnly, catchAsync(async (req, res) => {
  const { page = 1, limit = 20, paymentStatus } = req.query;
  const query = {};
  if (paymentStatus) query.paymentStatus = paymentStatus;

  const total = await Donation.countDocuments(query);
  const donations = await Donation.find(query)
    .populate('donor', 'name email')
    .sort('-createdAt')
    .skip((page - 1) * limit)
    .limit(Number(limit));

  const totals = await Donation.aggregate([
    { $match: query },
    { $group: { _id: '$paymentStatus', total: { $sum: '$amount' }, count: { $sum: 1 } } }
  ]);

  res.json({
    success: true,
    donations,
    totals,
    page: Number(page),
    pages: Math.ceil(total / limit),
    total
  });
}));

router.get('/mine', protect, catchAsync(async (req, res) => {
  const donations = await Donation.find({ donor: req.user._id })
    .sort('-createdAt')
    .limit(50);

  const completedTotal = donations
    .filter((d) => d.paymentStatus === 'completed')
    .reduce((sum, d) => sum + (d.amount || 0), 0);

  res.json({
    success: true,
    donations,
    total: donations.length,
    completedTotal
  });
}));

router.get('/', catchAsync(async (req, res) => {
  const { page = 1, limit = 12, craftType } = req.query;
  
  const query = { paymentStatus: 'completed' };
  if (craftType) query.craftType = craftType;

  const total = await Donation.countDocuments(query);
  const donations = await Donation.find(query)
    .populate('donor', 'name')
    .sort('-createdAt')
    .skip((page - 1) * limit)
    .limit(Number(limit));

  const totalAmount = await Donation.aggregate([
    { $match: { paymentStatus: 'completed' } },
    { $group: { _id: null, total: { $sum: '$amount' } } }
  ]);

  res.json({
    success: true,
    donations,
    totalAmount: totalAmount[0]?.total || 0,
    page: Number(page),
    pages: Math.ceil(total / limit),
    total
  });
}));

router.post('/', protect, [
  body('amount').isFloat({ min: 1 }).withMessage('Donation amount must be at least ₹1'),
  body('craftType').optional().isString().trim(),
  body('message').optional().isString().trim().isLength({ max: 500 }).withMessage('Message must be 500 characters or fewer'),
  body('isAnonymous').optional().isBoolean()
], validate, catchAsync(async (req, res) => {
  const { amount, craftType, campaign, message, isAnonymous } = req.body;
  
  const donation = await Donation.create({
    donor: req.user._id,
    amount: Number(amount),
    craftType,
    campaign,
    message,
    isAnonymous: Boolean(isAnonymous),
    paymentStatus: 'pending'
  });

  res.status(201).json({ success: true, donation });
}));

router.patch('/:id', protect, adminOnly, [
  body('paymentStatus')
    .isIn(DONATION_STATUSES)
    .withMessage(`paymentStatus must be one of: ${DONATION_STATUSES.join(', ')}`)
], validate, catchAsync(async (req, res) => {
  const donation = await Donation.findByIdAndUpdate(
    req.params.id,
    { paymentStatus: req.body.paymentStatus },
    { new: true, runValidators: true }
  ).populate('donor', 'name email');

  if (!donation) throw new ApiError(404, 'Donation not found');
  res.json({ success: true, donation });
}));

export default router;
