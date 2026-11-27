import express from 'express';
import { body } from 'express-validator';
import Product from '../models/Product.js';
import Artisan from '../models/Artisan.js';
import { protect, adminOnly, artisanOnly } from '../middleware/auth.js';
import validate from '../middleware/validate.js';
import catchAsync from '../utils/catchAsync.js';
import ApiError from '../utils/ApiError.js';
import {
  requireCloudinary,
  handleUpload,
  validateImageFiles,
  uploadImageBuffers,
  destroyImageByUrl,
  destroyImageUrls,
  PRODUCT_FOLDER,
  MAX_IMAGES_PER_PRODUCT
} from '../utils/images.js';

const router = express.Router();

const PRODUCT_CATEGORIES = ['textiles', 'pottery', 'jewelry', 'woodwork', 'metalwork', 'painting', 'sculpture', 'embroidery', 'other'];

// Load the Artisan profile of the logged-in user.
// Returns null for admins, because admins manage products of any artisan.
const getOwnArtisan = async (req) => {
  if (req.user.role === 'ADMIN') return null;
  const artisan = await Artisan.findOne({ user: req.user._id });
  if (!artisan) throw new ApiError(403, 'You need an artisan profile to manage products');
  return artisan;
};

// Load a product and make sure the current user is allowed to change it.
const findOwnedProduct = async (req, id) => {
  const product = await Product.findById(id);
  if (!product) throw new ApiError(404, 'Product not found');
  if (req.user.role === 'ADMIN') return product;

  const artisan = await getOwnArtisan(req);
  if (!product.artisan.equals(artisan._id)) {
    throw new ApiError(403, 'You can only manage your own products');
  }
  return product;
};

const productValidators = [
  body('name')
    .notEmpty().withMessage('Name is required').bail()
    .isString().withMessage('Name must be a string').bail()
    .trim()
    .isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
  body('description')
    .notEmpty().withMessage('Description is required').bail()
    .isString().withMessage('Description must be a string')
    .trim(),
  body('price')
    .notEmpty().withMessage('Price is required').bail()
    .isFloat({ gt: 0 }).withMessage('Price must be greater than 0'),
  body('category')
    .notEmpty().withMessage('Category is required').bail()
    .isIn(PRODUCT_CATEGORIES).withMessage(`Category must be one of: ${PRODUCT_CATEGORIES.join(', ')}`),
  body('craftType')
    .notEmpty().withMessage('Craft type is required').bail()
    .isString().withMessage('Craft type must be a string')
    .trim(),
  body('stock')
    .notEmpty().withMessage('Stock is required').bail()
    .isInt({ min: 0 }).withMessage('Stock must be an integer greater than or equal to 0'),
  body('images')
    .optional()
    .isArray().withMessage('Images must be an array'),
  body('isCustomizable')
    .optional()
    .isBoolean().withMessage('isCustomizable must be a boolean'),
  // Admin may set or change the owning artisan; must be a valid id when provided.
  // (Required-ness is enforced in POST — PUT stays a partial-safe update.)
  body('artisan')
    .optional({ values: 'falsy' })
    .isMongoId().withMessage('Artisan must be a valid id')
];

router.get('/', catchAsync(async (req, res) => {
  const { page = 1, limit = 12, category, craftType, minPrice, maxPrice, search, sort = '-createdAt' } = req.query;
  
  const query = { isActive: true };
  
  if (category) query.category = category;
  if (craftType) query.craftType = craftType;
  if (minPrice || maxPrice) {
    query.price = {};
    if (minPrice) query.price.$gte = Number(minPrice);
    if (maxPrice) query.price.$lte = Number(maxPrice);
  }
  if (search) {
    query.$text = { $search: search };
  }

  const total = await Product.countDocuments(query);
  // Public list = card data only: lean + field selection + 2 images (cards show
  // images[0]; [1] covers retry). Cuts payload size and lets populate return a
  // plain object instead of a full hydrated subdocument.
  const products = await Product.find(query)
    .select('name price category craftType stock images artisan')
    .populate('artisan', 'businessName')
    .sort(sort)
    .skip((page - 1) * limit)
    .limit(Number(limit))
    .lean()
    .then((docs) =>
      docs.map((doc) => ({ ...doc, images: (doc.images || []).slice(0, 2) }))
    );

  res.json({
    success: true,
    products,
    page: Number(page),
    pages: Math.ceil(total / limit),
    total
  });
}));

router.get('/admin', protect, adminOnly, catchAsync(async (req, res) => {
  const { page = 1, limit = 20, search, isActive } = req.query;

  const query = {};
  if (isActive !== undefined && isActive !== '') query.isActive = isActive === 'true';
  if (search) {
    const regex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    query.$or = [{ name: regex }, { category: regex }, { craftType: regex }];
  }

  const total = await Product.countDocuments(query);
  const products = await Product.find(query)
    .populate('artisan', 'businessName profileImage')
    .sort('-createdAt')
    .skip((page - 1) * limit)
    .limit(Number(limit));

  res.json({
    success: true,
    products,
    page: Number(page),
    pages: Math.ceil(total / limit),
    total
  });
}));

// The logged-in artisan's own products — includes inactive ones, unlike the public list.
router.get('/mine', protect, artisanOnly, catchAsync(async (req, res) => {
  const artisan = await getOwnArtisan(req);
  if (!artisan) throw new ApiError(403, 'You need an artisan profile to manage products');

  const { page = 1, limit = 20, search, isActive } = req.query;

  const query = { artisan: artisan._id };
  if (isActive !== undefined && isActive !== '') query.isActive = isActive === 'true';
  if (search) {
    const regex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    query.$or = [{ name: regex }, { category: regex }, { craftType: regex }];
  }

  const total = await Product.countDocuments(query);
  const products = await Product.find(query)
    .sort('-createdAt')
    .skip((page - 1) * limit)
    .limit(Number(limit));

  res.json({
    success: true,
    products,
    page: Number(page),
    pages: Math.ceil(total / limit),
    total
  });
}));

// One of the logged-in artisan's own products (includes inactive ones).
// This is what the product edit page loads — ownership is checked here so a
// non-owner never even sees the document.
router.get('/mine/:id', protect, artisanOnly, catchAsync(async (req, res) => {
  const artisan = await getOwnArtisan(req);
  if (!artisan) throw new ApiError(403, 'You need an artisan profile to manage products');

  const product = await Product.findById(req.params.id);
  if (!product) throw new ApiError(404, 'Product not found');
  if (!product.artisan.equals(artisan._id)) {
    throw new ApiError(403, 'You can only manage your own products');
  }

  res.json({ success: true, product });
}));

router.get('/:id', catchAsync(async (req, res) => {
  // `user` lets the frontend detect "this is my own product" (artisan ownership).
  // giTag powers the "Craft heritage" block; the extra artisan fields power
  // the "Meet the maker" section — both are additive, nothing else changes.
  const product = await Product.findById(req.params.id)
    .populate('artisan', 'businessName story profileImage coverImage location user craftTypes isVerified rating reviewCount yearsOfExperience')
    .populate('giTag', 'name type description location history significance technique products');
  
  if (!product) throw new ApiError(404, 'Product not found');
  
  res.json({ success: true, product });
}));

router.post('/', protect, artisanOnly, productValidators, validate, catchAsync(async (req, res) => {
  const body = { ...req.body };

  if (req.user.role === 'ADMIN') {
    // Admin must point the product at an existing artisan.
    if (!body.artisan) throw new ApiError(400, 'Artisan id is required');
    const artisan = await Artisan.findById(body.artisan);
    if (!artisan) throw new ApiError(404, 'Artisan not found');
  } else {
    // Artisan always owns what they create; ignore any artisan id from the client.
    const artisan = await getOwnArtisan(req);
    body.artisan = artisan._id;
  }

  const product = await Product.create(body);
  res.status(201).json({ success: true, product });
}));

router.put('/:id', protect, artisanOnly, productValidators, validate, catchAsync(async (req, res) => {
  const product = await findOwnedProduct(req, req.params.id);

  const updates = { ...req.body };
  // Only an admin may move a product to a different artisan.
  if (req.user.role !== 'ADMIN') delete updates.artisan;

  const updated = await Product.findByIdAndUpdate(product._id, updates, { new: true, runValidators: true });
  res.json({ success: true, product: updated });
}));

router.patch('/:id', protect, artisanOnly, [
  body('isActive').optional().isBoolean().withMessage('isActive must be a boolean'),
  body('stock').optional().isInt({ min: 0 }).withMessage('Stock must be an integer greater than or equal to 0')
], validate, catchAsync(async (req, res) => {
  const product = await findOwnedProduct(req, req.params.id);

  const updates = {};
  if (req.body.isActive !== undefined) updates.isActive = req.body.isActive;
  if (req.body.stock !== undefined) updates.stock = req.body.stock;
  if (Object.keys(updates).length === 0) throw new ApiError(400, 'No valid fields to update');

  const updated = await Product.findByIdAndUpdate(product._id, updates, { new: true, runValidators: true });
  res.json({ success: true, product: updated });
}));

// Clone a product into a new draft: every detail is copied, the images are
// NOT (they belong to the original upload) and the copy starts hidden so the
// artisan can review it before showing it in the shop.
router.post('/:id/duplicate', protect, artisanOnly, catchAsync(async (req, res) => {
  const product = await findOwnedProduct(req, req.params.id);
  const source = product.toObject();

  const copy = await Product.create({
    name: `Copy of ${source.name}`,
    description: source.description,
    price: source.price,
    category: source.category,
    craftType: source.craftType,
    material: source.material,
    dimensions: source.dimensions,
    weight: source.weight,
    color: source.color,
    stock: source.stock,
    tags: source.tags,
    isCustomizable: source.isCustomizable,
    customizationOptions: source.customizationOptions,
    giTag: source.giTag,
    artisan: source.artisan,
    images: [],
    isActive: false
  });

  res.status(201).json({ success: true, product: copy });
}));

// ----- product images (Cloudinary) -----
// The product is always created first (POST /), then its images are uploaded
// here — a product document therefore never has to wait on a file upload.

// Append 1-6 images; the array stays plain secure_url strings.
router.post(
  '/:id/images',
  protect,
  artisanOnly,
  requireCloudinary,
  handleUpload('images', MAX_IMAGES_PER_PRODUCT),
  catchAsync(async (req, res) => {
    const product = await findOwnedProduct(req, req.params.id);
    const files = validateImageFiles(req.files);

    const used = (product.images || []).length;
    const room = MAX_IMAGES_PER_PRODUCT - used;
    if (room <= 0) {
      throw new ApiError(400, `A product can have at most ${MAX_IMAGES_PER_PRODUCT} images`);
    }
    if (files.length > room) {
      throw new ApiError(
        400,
        `A product can have at most ${MAX_IMAGES_PER_PRODUCT} images — ${room} more allowed`
      );
    }

    // All files are validated before anything reaches Cloudinary, so a bad file
    // in a multi-file request never leaves half-uploaded assets behind.
    const uploaded = await uploadImageBuffers(files, { folder: PRODUCT_FOLDER });
    product.images = [...(product.images || []), ...uploaded.map((item) => item.secure_url)];
    await product.save();

    res.status(201).json({ success: true, product });
  })
);

// Remove one image by URL (body: { url }) and delete it from Cloudinary.
router.delete('/:id/images', protect, artisanOnly, catchAsync(async (req, res) => {
  const product = await findOwnedProduct(req, req.params.id);
  const url = typeof req.body?.url === 'string' ? req.body.url.trim() : '';
  if (!url) throw new ApiError(400, 'Image url is required');

  const images = product.images || [];
  if (!images.includes(url)) throw new ApiError(404, 'Image not found on this product');

  product.images = images.filter((image) => image !== url);
  await product.save();

  // Best-effort remote delete — the local removal must never fail because of it.
  await destroyImageByUrl(url);

  res.json({ success: true, product });
}));

// Reorder; the first entry becomes the cover image.
router.put('/:id/images/order', protect, artisanOnly, [
  body('images').isArray({ min: 1 }).withMessage('images must be a non-empty array'),
  body('images.*').isString().withMessage('images must contain only URLs')
], validate, catchAsync(async (req, res) => {
  const product = await findOwnedProduct(req, req.params.id);
  const current = product.images || [];
  const next = req.body.images;

  const sameSet =
    next.length === current.length &&
    [...next].sort().join('\n') === [...current].sort().join('\n');
  if (!sameSet) {
    throw new ApiError(400, 'The new order must contain exactly the current images');
  }

  product.images = next;
  await product.save();

  res.json({ success: true, product });
}));

router.delete('/:id', protect, artisanOnly, catchAsync(async (req, res) => {
  const product = await findOwnedProduct(req, req.params.id);
  await Product.findByIdAndDelete(product._id);

  // Cloudinary failures never fail the product delete (never throws).
  await destroyImageUrls(product.images || []);

  res.json({ success: true, message: 'Product deleted' });
}));

export default router;
