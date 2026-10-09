import User from '../models/User.js';
import catchAsync from '../utils/catchAsync.js';
import ApiError from '../utils/ApiError.js';
import { assertPurchasable, applyCartAdd, buildCart } from './cartController.js';

const PRODUCT_SELECT = 'name price images stock isActive artisan';
const ARTISAN_SELECT = 'businessName';

// Build the wishlist payload: populated product details.
// Products that no longer exist are filtered out of the response.
const buildWishlist = async (user) => {
  await User.populate(user, {
    path: 'wishlist',
    select: PRODUCT_SELECT,
    populate: { path: 'artisan', select: ARTISAN_SELECT }
  });

  const items = user.wishlist.filter(Boolean);
  return { items, total: items.length };
};

// GET /api/wishlist
export const getWishlist = catchAsync(async (req, res) => {
  const wishlist = await buildWishlist(req.user);
  res.json({ success: true, ...wishlist });
});

// POST /api/wishlist/:productId — add, never duplicated
export const addToWishlist = catchAsync(async (req, res) => {
  const { productId } = req.params;

  const product = await assertPurchasable(req.user, productId, 'wishlist');

  const alreadyWishlisted = req.user.wishlist.some((id) => String(id) === String(product._id));
  if (!alreadyWishlisted) {
    req.user.wishlist.push(product._id);
    await req.user.save();
  }

  const wishlist = await buildWishlist(req.user);
  res.json({
    success: true,
    message: alreadyWishlisted ? 'Product is already in your wishlist' : 'Added to wishlist',
    ...wishlist
  });
});

// DELETE /api/wishlist/:productId — remove one item
export const removeFromWishlist = catchAsync(async (req, res) => {
  const { productId } = req.params;

  const index = req.user.wishlist.findIndex((id) => String(id) === String(productId));
  if (index === -1) throw new ApiError(404, 'Product is not in your wishlist');

  req.user.wishlist.splice(index, 1);
  await req.user.save();

  const wishlist = await buildWishlist(req.user);
  res.json({ success: true, message: 'Removed from wishlist', ...wishlist });
});

// POST /api/wishlist/:productId/move-to-cart
// The wishlist entry is only removed after the cart accepts the item,
// so a failed move (e.g. out of stock) leaves the wishlist untouched.
export const moveToCart = catchAsync(async (req, res) => {
  const { productId } = req.params;
  const quantity = Number(req.body.quantity || 1);

  const inWishlist = req.user.wishlist.some((id) => String(id) === String(productId));
  if (!inWishlist) throw new ApiError(404, 'Product is not in your wishlist');

  // Validates existence, availability and the own-product rule.
  const product = await assertPurchasable(req.user, productId, 'cart');
  applyCartAdd(req.user, product, quantity);

  const index = req.user.wishlist.findIndex((id) => String(id) === String(productId));
  req.user.wishlist.splice(index, 1);
  await req.user.save();

  const cart = await buildCart(req.user);
  const wishlist = await buildWishlist(req.user);

  res.json({
    success: true,
    message: 'Moved to cart',
    cart,
    wishlist
  });
});
