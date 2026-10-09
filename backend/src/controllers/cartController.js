import User from '../models/User.js';
import Product from '../models/Product.js';
import Artisan from '../models/Artisan.js';
import catchAsync from '../utils/catchAsync.js';
import ApiError from '../utils/ApiError.js';

const PRODUCT_SELECT = 'name price images stock isActive artisan';
const ARTISAN_SELECT = 'businessName';

// Check that a user is allowed to buy this product.
// Throws a clear error when the product is missing, inactive, or owned by the user.
export const assertPurchasable = async (user, productId, listName) => {
  const product = await Product.findById(productId);
  if (!product) throw new ApiError(404, 'Product not found');
  if (!product.isActive) throw new ApiError(400, 'Product is not available');

  // An artisan can never buy their own product.
  const ownProfile = await Artisan.findOne({ user: user._id }).select('_id');
  if (ownProfile && product.artisan && String(product.artisan) === String(ownProfile._id)) {
    throw new ApiError(400, `You cannot add your own product to the ${listName}`);
  }

  return product;
};

// Add a line to the user's cart (mutates the user, does NOT save).
// If the product is already in the cart the quantity is increased.
export const applyCartAdd = (user, product, quantity) => {
  const line = user.cart.find((l) => String(l.product) === String(product._id));
  const newQuantity = (line ? line.quantity : 0) + quantity;

  // Price is never taken from the client — we only touch quantity here.
  if (newQuantity > product.stock) {
    throw new ApiError(400, `Insufficient stock for ${product.name}: only ${product.stock} available`);
  }

  if (line) line.quantity = newQuantity;
  else user.cart.push({ product: product._id, quantity });
};

// Build the cart payload sent to the client.
// Products that were deleted or are out of stock are KEPT in the cart but
// marked unavailable and excluded from the totals (never silently removed).
export const buildCart = async (user) => {
  await User.populate(user, {
    path: 'cart.product',
    select: PRODUCT_SELECT,
    populate: { path: 'artisan', select: ARTISAN_SELECT }
  });

  let subtotal = 0;
  let availableCount = 0;
  let unavailableCount = 0;

  const items = user.cart.map((line) => {
    const product = line.product; // null when the product was deleted

    let available = true;
    let reason = null;
    let unitPrice = 0;

    if (!product) {
      available = false;
      reason = 'Product no longer exists';
    } else {
      unitPrice = product.price;
      if (!product.isActive) {
        available = false;
        reason = 'Product is no longer available';
      } else if (product.stock < 1) {
        available = false;
        reason = 'Out of stock';
      } else if (product.stock < line.quantity) {
        available = false;
        reason = `Only ${product.stock} available`;
      }
    }

    const lineTotal = available ? unitPrice * line.quantity : 0;
    if (available) {
      subtotal += lineTotal;
      availableCount += 1;
    } else {
      unavailableCount += 1;
    }

    return {
      product,
      quantity: line.quantity,
      unitPrice,
      lineTotal,
      available,
      reason
    };
  });

  return { items, subtotal, availableCount, unavailableCount };
};

// GET /api/cart
export const getCart = catchAsync(async (req, res) => {
  const cart = await buildCart(req.user);
  res.json({ success: true, ...cart });
});

// POST /api/cart — add { productId, quantity }
export const addToCart = catchAsync(async (req, res) => {
  const { productId } = req.body;
  const quantity = Number(req.body.quantity);

  const product = await assertPurchasable(req.user, productId, 'cart');
  applyCartAdd(req.user, product, quantity);
  await req.user.save();

  const cart = await buildCart(req.user);
  res.json({ success: true, message: 'Added to cart', ...cart });
});

// PUT /api/cart/:productId — set quantity (0 or less removes the item)
export const setCartQuantity = catchAsync(async (req, res) => {
  const { productId } = req.params;
  const quantity = Number(req.body.quantity);

  const lineIndex = req.user.cart.findIndex((l) => String(l.product) === String(productId));

  // Quantity 0 or less means "remove this line".
  if (quantity <= 0) {
    if (lineIndex >= 0) req.user.cart.splice(lineIndex, 1);
    await req.user.save();

    const cart = await buildCart(req.user);
    return res.json({
      success: true,
      message: lineIndex >= 0 ? 'Item removed from cart' : 'Product was not in your cart',
      ...cart
    });
  }

  const product = await assertPurchasable(req.user, productId, 'cart');
  if (quantity > product.stock) {
    throw new ApiError(400, `Insufficient stock for ${product.name}: only ${product.stock} available`);
  }

  if (lineIndex >= 0) req.user.cart[lineIndex].quantity = quantity;
  else req.user.cart.push({ product: product._id, quantity });
  await req.user.save();

  const cart = await buildCart(req.user);
  res.json({ success: true, message: 'Cart updated', ...cart });
});

// DELETE /api/cart/:productId — remove one item
export const removeCartItem = catchAsync(async (req, res) => {
  const lineIndex = req.user.cart.findIndex((l) => String(l.product) === String(req.params.productId));
  if (lineIndex === -1) throw new ApiError(404, 'Product is not in your cart');

  req.user.cart.splice(lineIndex, 1);
  await req.user.save();

  const cart = await buildCart(req.user);
  res.json({ success: true, message: 'Item removed from cart', ...cart });
});

// DELETE /api/cart — clear the whole cart
export const clearCart = catchAsync(async (req, res) => {
  req.user.cart = [];
  await req.user.save();

  const cart = await buildCart(req.user);
  res.json({ success: true, message: 'Cart cleared', ...cart });
});
