import express from 'express';
import { protect, adminOnly } from '../middleware/auth.js';
import User from '../models/User.js';
import Product from '../models/Product.js';
import Order from '../models/Order.js';
import Artisan from '../models/Artisan.js';
import ArtisanApplication from '../models/ArtisanApplication.js';
import Workshop from '../models/Workshop.js';
import Donation from '../models/Donation.js';
import catchAsync from '../utils/catchAsync.js';
import ApiError from '../utils/ApiError.js';

const router = express.Router();

router.get('/stats', protect, adminOnly, catchAsync(async (req, res) => {
  const [users, products, orders, artisans, donations, paidOrders, pendingApplications] = await Promise.all([
    User.countDocuments(),
    Product.countDocuments(),
    Order.countDocuments(),
    Artisan.countDocuments(),
    Donation.aggregate([{ $match: { paymentStatus: 'completed' } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
    Order.aggregate([{ $match: { paymentStatus: 'paid' } }, { $group: { _id: null, total: { $sum: '$total' } } }]),
    ArtisanApplication.countDocuments({ status: 'PENDING' })
  ]);

  const recentOrders = await Order.find().sort('-createdAt').limit(5)
    .populate('user', 'name email');

  const topProducts = await Product.find().sort('-createdAt').limit(5);

  res.json({
    success: true,
    stats: {
      users,
      products,
      orders,
      artisans,
      revenue: paidOrders[0]?.total || 0,
      totalDonations: donations[0]?.total || 0,
      pendingApplications,
      recentOrders,
      topProducts
    }
  });
}));

router.get('/users', protect, adminOnly, catchAsync(async (req, res) => {
  const { page = 1, limit = 20, role, search } = req.query;
  const query = {};
  if (role) query.role = role;
  if (search) {
    const regex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    query.$or = [{ name: regex }, { email: regex }];
  }
  
  const users = await User.find(query).select('-password').sort('-createdAt')
    .skip((page - 1) * limit).limit(Number(limit));
  
  res.json({ success: true, users, total: await User.countDocuments(query) });
}));

router.put('/users/:id', protect, adminOnly, catchAsync(async (req, res) => {
  const allowlist = ['name', 'role', 'status'];
  const updates = {};
  for (const field of allowlist) {
    if (req.body[field] !== undefined) updates[field] = req.body[field];
  }

  const user = await User.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true }).select('-password');
  if (!user) throw new ApiError(404, 'User not found');
  res.json({ success: true, user });
}));

router.get('/orders', protect, adminOnly, catchAsync(async (req, res) => {
  const { page = 1, limit = 20, orderStatus, paymentStatus } = req.query;
  const query = {};
  if (orderStatus) query.orderStatus = orderStatus;
  if (paymentStatus) query.paymentStatus = paymentStatus;

  const total = await Order.countDocuments(query);
  const orders = await Order.find(query)
    .populate('user', 'name email')
    .populate('items.product', 'name price')
    .sort('-createdAt')
    .skip((page - 1) * limit)
    .limit(Number(limit));

  res.json({
    success: true,
    orders,
    page: Number(page),
    pages: Math.ceil(total / limit),
    total
  });
}));

router.put('/orders/:id/status', protect, adminOnly, catchAsync(async (req, res) => {
  const { orderStatus } = req.body;
  const allowed = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];
  if (!allowed.includes(orderStatus)) {
    throw new ApiError(400, `Order status must be one of: ${allowed.join(', ')}`);
  }

  const order = await Order.findById(req.params.id);
  if (!order) throw new ApiError(404, 'Order not found');

  if (orderStatus === 'cancelled' && order.orderStatus !== 'cancelled') {
    await Promise.all(order.items.map((item) =>
      Product.updateOne({ _id: item.product }, { $inc: { stock: item.quantity } })
    ));
  }

  order.orderStatus = orderStatus;
  await order.save();

  res.json({ success: true, order });
}));

router.delete('/users/:id', protect, adminOnly, catchAsync(async (req, res) => {
  const user = await User.findByIdAndDelete(req.params.id);
  if (!user) throw new ApiError(404, 'User not found');
  res.json({ success: true, message: 'User deleted' });
}));

export default router;
