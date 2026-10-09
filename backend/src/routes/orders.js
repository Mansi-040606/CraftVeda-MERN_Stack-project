import express from 'express';
import { body } from 'express-validator';
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import { protect } from '../middleware/auth.js';
import validate from '../middleware/validate.js';
import catchAsync from '../utils/catchAsync.js';
import ApiError from '../utils/ApiError.js';

const router = express.Router();

const PAYMENT_METHODS = ['cod', 'card', 'upi', 'netbanking', 'wallet'];

const createOrderValidators = [
  body('items')
    .notEmpty().withMessage('Items are required').bail()
    .isArray({ min: 1 }).withMessage('Items must be a non-empty array'),
  body('items.*.product')
    .notEmpty().withMessage('Product is required').bail()
    .isMongoId().withMessage('Product must be a valid id'),
  body('items.*.quantity')
    .notEmpty().withMessage('Quantity is required').bail()
    .isInt({ min: 1 }).withMessage('Quantity must be an integer greater than or equal to 1'),
  body('shippingAddress')
    .notEmpty().withMessage('Shipping address is required').bail()
    .isObject().withMessage('Shipping address must be an object'),
  body('shippingAddress.street').notEmpty().withMessage('Street is required'),
  body('shippingAddress.city').notEmpty().withMessage('City is required'),
  body('shippingAddress.state').notEmpty().withMessage('State is required'),
  body('shippingAddress.pincode').notEmpty().withMessage('Pincode is required'),
  body('paymentMethod')
    .notEmpty().withMessage('Payment method is required').bail()
    .isIn(PAYMENT_METHODS).withMessage(`Payment method must be one of: ${PAYMENT_METHODS.join(', ')}`)
];

router.get('/', protect, catchAsync(async (req, res) => {
  const { page = 1, limit = 10, status } = req.query;
  
  const query = { user: req.user._id };
  if (status) query.orderStatus = status;

  const total = await Order.countDocuments(query);
  const orders = await Order.find(query)
    .populate('items.product', 'name images price')
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

router.get('/:id', protect, catchAsync(async (req, res) => {
  const order = await Order.findOne({ _id: req.params.id, user: req.user._id })
    .populate('items.product', 'name images price category')
    .populate('certificate');
  
  if (!order) throw new ApiError(404, 'Order not found');
  
  res.json({ success: true, order });
}));

router.post('/', protect, createOrderValidators, validate, catchAsync(async (req, res) => {
  const { items, shippingAddress, paymentMethod, notes } = req.body;

  const productIds = [...new Set(items.map((i) => i.product))];
  const products = await Product.find({ _id: { $in: productIds } });
  const productMap = new Map(products.map((p) => [p._id.toString(), p]));

  const orderItems = [];
  for (const item of items) {
    const product = productMap.get(String(item.product));
    if (!product) throw new ApiError(404, 'Product not found');
    if (!product.isActive) throw new ApiError(400, 'Product is unavailable');
    if (product.stock < item.quantity) {
      throw new ApiError(400, `Insufficient stock for ${product.name}`);
    }

    orderItems.push({
      product: product._id,
      quantity: item.quantity,
      price: product.price,
      customization: item.customization
    });
  }

  const reserved = [];
  try {
    for (const item of orderItems) {
      const updated = await Product.updateOne(
        { _id: item.product, stock: { $gte: item.quantity } },
        { $inc: { stock: -item.quantity } }
      );
      if (updated.modifiedCount === 0) {
        const product = productMap.get(item.product.toString());
        throw new ApiError(400, `Insufficient stock for ${product ? product.name : 'product'}`);
      }
      reserved.push(item);
    }
  } catch (error) {
    await Promise.all(reserved.map((item) =>
      Product.updateOne({ _id: item.product }, { $inc: { stock: item.quantity } })
    ));
    throw error;
  }

  const subtotal = orderItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const shippingCost = subtotal > 500 ? 0 : 50;
  const tax = Math.round(subtotal * 0.18);
  const total = subtotal + shippingCost + tax;

  const order = await Order.create({
    user: req.user._id,
    items: orderItems,
    shippingAddress,
    paymentMethod,
    subtotal,
    shippingCost,
    tax,
    total,
    notes
  });

  res.status(201).json({ success: true, order });
}));

router.put('/:id/cancel', protect, catchAsync(async (req, res) => {
  const order = await Order.findOne({ _id: req.params.id, user: req.user._id });
  
  if (!order) throw new ApiError(404, 'Order not found');
  if (['shipped', 'delivered', 'cancelled'].includes(order.orderStatus)) {
    throw new ApiError(400, 'Cannot cancel this order');
  }

  order.orderStatus = 'cancelled';
  await order.save();

  await Promise.all(order.items.map((item) =>
    Product.updateOne({ _id: item.product }, { $inc: { stock: item.quantity } })
  ));

  res.json({ success: true, order });
}));

export default router;
