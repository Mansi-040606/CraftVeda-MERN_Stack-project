import express from 'express';
import { body } from 'express-validator';
import Certificate from '../models/Certificate.js';
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import QRCode from 'qrcode';
import { protect } from '../middleware/auth.js';
import validate from '../middleware/validate.js';
import catchAsync from '../utils/catchAsync.js';
import ApiError from '../utils/ApiError.js';

const router = express.Router();

const generateValidators = [
  body('orderId')
    .notEmpty().withMessage('Order id is required').bail()
    .isMongoId().withMessage('Order must be a valid id'),
  body('productId')
    .optional()
    .isMongoId().withMessage('Product must be a valid id')
];

router.get('/:certificateNumber', catchAsync(async (req, res) => {
  const certificate = await Certificate.findOne({ 
    certificateNumber: req.params.certificateNumber 
  })
    .populate('product', 'name images category craftType')
    .populate('artisan', 'businessName story profileImage')
    .populate('buyer', 'name');

  if (!certificate) throw new ApiError(404, 'Certificate not found');
  
  res.json({ success: true, certificate });
}));

router.post('/generate', protect, generateValidators, validate, catchAsync(async (req, res) => {
  const { orderId, productId } = req.body;

  // The order must belong to the logged-in user and must be delivered.
  const order = await Order.findById(orderId);
  if (!order) throw new ApiError(404, 'Order not found');
  if (!order.user.equals(req.user._id)) {
    throw new ApiError(403, 'You can only generate certificates for your own orders');
  }
  if (order.orderStatus !== 'delivered') {
    throw new ApiError(400, 'Certificate can only be generated after the order is delivered');
  }

  // The product must be one of the items in this order.
  const orderedProductIds = order.items.map((item) => item.product.toString());
  if (productId && !orderedProductIds.includes(productId)) {
    throw new ApiError(400, 'Product is not part of this order');
  }
  const targetProductId = productId || orderedProductIds[0];

  const product = await Product.findById(targetProductId).select('artisan name');
  if (!product) throw new ApiError(404, 'Product not found');

  // One certificate per order + product.
  const existing = await Certificate.findOne({ order: order._id, product: product._id });
  if (existing) throw new ApiError(400, 'A certificate already exists for this order and product');

  const certificateNumber = `CV-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

  const qrData = JSON.stringify({
    cert: certificateNumber,
    product: product._id.toString(),
    artisan: product.artisan.toString(),
    timestamp: Date.now()
  });

  const qrCode = await QRCode.toDataURL(qrData);

  const certificate = await Certificate.create({
    order: order._id,
    product: product._id,
    artisan: product.artisan,
    buyer: req.user._id,
    certificateNumber,
    qrCode
  });

  res.status(201).json({ success: true, certificate });
}));

router.get('/verify/:certificateNumber', catchAsync(async (req, res) => {
  const certificate = await Certificate.findOne({ 
    certificateNumber: req.params.certificateNumber 
  });

  if (!certificate) {
    return res.json({ success: false, valid: false, message: 'Certificate not found' });
  }
  
  res.json({
    success: true,
    valid: certificate.isValid,
    message: certificate.isValid ? 'Certificate is valid' : 'Certificate has been revoked'
  });
}));

export default router;
