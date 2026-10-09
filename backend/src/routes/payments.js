import express from 'express';
import crypto from 'crypto';
import Razorpay from 'razorpay';
import Order from '../models/Order.js';
import Donation from '../models/Donation.js';
import { protect } from '../middleware/auth.js';
import catchAsync from '../utils/catchAsync.js';
import ApiError from '../utils/ApiError.js';

const router = express.Router();

const getRazorpay = () => new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

const assertConfigured = () => {
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    throw new ApiError(500, 'Razorpay is not configured');
  }
};

router.post('/create-order', protect, catchAsync(async (req, res) => {
  assertConfigured();

  const { currency = 'INR', referenceType, referenceId } = req.body;
  if (!['order', 'donation'].includes(referenceType)) {
    throw new ApiError(400, 'referenceType must be "order" or "donation"');
  }
  if (!referenceId) throw new ApiError(400, 'referenceId is required');

  let expectedAmount;
  if (referenceType === 'order') {
    const order = await Order.findById(referenceId);
    if (!order) throw new ApiError(404, 'Order not found');
    if (!order.user.equals(req.user._id)) throw new ApiError(403, 'Not authorized');
    if (order.paymentStatus === 'paid') throw new ApiError(400, 'Order is already paid');
    expectedAmount = order.total;
  } else {
    const donation = await Donation.findById(referenceId);
    if (!donation) throw new ApiError(404, 'Donation not found');
    if (!donation.donor.equals(req.user._id)) throw new ApiError(403, 'Not authorized');
    if (donation.paymentStatus === 'completed') throw new ApiError(400, 'Donation is already paid');
    expectedAmount = donation.amount;
  }

  const razorpayOrder = await getRazorpay().orders.create({
    amount: Math.round(expectedAmount * 100),
    currency,
    receipt: `${referenceType}_${referenceId}`,
    payment_capture: 1
  });

  res.json({
    success: true,
    key: process.env.RAZORPAY_KEY_ID,
    razorpayOrderId: razorpayOrder.id,
    amount: razorpayOrder.amount,
    currency: razorpayOrder.currency
  });
}));

router.post('/verify', protect, catchAsync(async (req, res) => {
  assertConfigured();

  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    throw new ApiError(400, 'Missing payment verification details');
  }

  let razorpayOrder;
  try {
    razorpayOrder = await getRazorpay().orders.fetch(razorpay_order_id);
  } catch (error) {
    throw new ApiError(400, 'Invalid Razorpay order');
  }

  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest('hex');

  const provided = Buffer.from(String(razorpay_signature));
  const expected = Buffer.from(expectedSignature);
  const valid = provided.length === expected.length && crypto.timingSafeEqual(provided, expected);
  if (!valid) throw new ApiError(400, 'Payment signature verification failed');

  const receipt = razorpayOrder.receipt || '';
  const separator = receipt.indexOf('_');
  if (separator === -1) throw new ApiError(400, 'Invalid payment receipt');
  const referenceType = receipt.slice(0, separator);
  const referenceId = receipt.slice(separator + 1);

  if (referenceType === 'order') {
    const order = await Order.findById(referenceId);
    if (!order) throw new ApiError(404, 'Order not found');
    if (!order.user.equals(req.user._id)) throw new ApiError(403, 'Not authorized');
    if (razorpayOrder.amount !== Math.round(order.total * 100)) {
      throw new ApiError(400, 'Payment amount does not match order');
    }

    order.paymentStatus = 'paid';
    order.paymentId = razorpay_payment_id;
    if (order.orderStatus === 'pending') order.orderStatus = 'confirmed';
    await order.save();

    return res.json({ success: true, order });
  }

  if (referenceType === 'donation') {
    const donation = await Donation.findById(referenceId);
    if (!donation) throw new ApiError(404, 'Donation not found');
    if (!donation.donor.equals(req.user._id)) throw new ApiError(403, 'Not authorized');
    if (razorpayOrder.amount !== Math.round(donation.amount * 100)) {
      throw new ApiError(400, 'Payment amount does not match donation');
    }

    donation.paymentStatus = 'completed';
    donation.paymentId = razorpay_payment_id;
    await donation.save();

    return res.json({ success: true, donation });
  }

  throw new ApiError(400, 'Unknown payment receipt type');
}));

export default router;
