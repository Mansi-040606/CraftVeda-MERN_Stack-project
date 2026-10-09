import express from 'express';
import Donation from '../models/Donation.js';
import { protect, adminOnly } from '../middleware/auth.js';
import catchAsync from '../utils/catchAsync.js';

const router = express.Router();

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

router.post('/', protect, catchAsync(async (req, res) => {
  const { amount, craftType, campaign, message, isAnonymous } = req.body;
  
  const donation = await Donation.create({
    donor: req.user._id,
    amount,
    craftType,
    campaign,
    message,
    isAnonymous,
    paymentStatus: 'pending'
  });

  res.status(201).json({ success: true, donation });
}));

export default router;
