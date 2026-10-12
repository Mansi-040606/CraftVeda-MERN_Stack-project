import Artisan from '../models/Artisan.js';
import Product from '../models/Product.js';
import Order from '../models/Order.js';
import catchAsync from '../utils/catchAsync.js';
import ApiError from '../utils/ApiError.js';

// A product at or below this stock level is reported as "low stock".
export const LOW_STOCK_THRESHOLD = 5;

// Load the Artisan profile of the logged-in user.
const getOwnArtisan = async (user) => {
  const artisan = await Artisan.findOne({ user: user._id });
  if (!artisan) throw new ApiError(403, 'You need an artisan profile to view this');
  return artisan;
};

// Every product id owned by an artisan — the match key for all order queries.
const ownProductIds = async (artisanId) => {
  const products = await Product.find({ artisan: artisanId }).select('_id');
  return products.map((p) => p._id);
};

// Orders never store which artisan a line belongs to, so ownership is decided
// from the raw product ids BEFORE populate replaces them (a deleted product
// would otherwise become null and lose its owner).
const snapshotOwnedItems = (orders, ownedSet) =>
  new Map(
    orders.map((order) => [
      String(order._id),
      new Set(
        order.items
          .filter((item) => ownedSet.has(String(item.product)))
          .map((item) => String(item._id))
      )
    ])
  );

// Keep only the artisan's own lines and attach what the dashboard needs to show.
const shapeOwnedOrders = (orders, ownedItemIdsByOrder) =>
  orders
    .map((order) => {
      const ownedIds = ownedItemIdsByOrder.get(String(order._id)) || new Set();
      const items = order.items.filter((item) => ownedIds.has(String(item._id)));

      return {
        _id: order._id,
        createdAt: order.createdAt,
        orderStatus: order.orderStatus,
        paymentStatus: order.paymentStatus,
        customer: order.user,
        items,
        itemCount: items.length,
        itemsTotal: items.reduce((sum, item) => sum + item.price * item.quantity, 0)
      };
    })
    // An order that only matched through since-deleted products shows nothing.
    .filter((order) => order.items.length > 0);

// GET /api/artisans/me/stats
export const getMyStats = catchAsync(async (req, res) => {
  const artisan = await getOwnArtisan(req.user);
  const productIds = await ownProductIds(artisan._id);
  const ownedSet = new Set(productIds.map(String));

  const [totalProducts, activeProducts, lowStockProducts, totalOrders, salesByProduct] = await Promise.all([
    Product.countDocuments({ artisan: artisan._id }),
    Product.countDocuments({ artisan: artisan._id, isActive: true }),
    Product.countDocuments({ artisan: artisan._id, stock: { $lte: LOW_STOCK_THRESHOLD } }),
    Order.countDocuments({ 'items.product': { $in: productIds } }),
    // Only this artisan's lines, only non-cancelled orders.
    Order.aggregate([
      { $match: { 'items.product': { $in: productIds }, orderStatus: { $ne: 'cancelled' } } },
      { $unwind: '$items' },
      { $match: { 'items.product': { $in: productIds } } },
      {
        $group: {
          _id: '$items.product',
          quantity: { $sum: '$items.quantity' },
          revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } }
        }
      },
      { $sort: { quantity: -1, revenue: -1 } }
    ])
  ]);

  const itemsSold = salesByProduct.reduce((sum, row) => sum + row.quantity, 0);
  const revenue = salesByProduct.reduce((sum, row) => sum + row.revenue, 0);

  const topIds = salesByProduct.filter((row) => row.quantity > 0).slice(0, 3).map((row) => row._id);
  const topProducts = await Product.find({ _id: { $in: topIds } })
    .select('name images price stock averageRating reviewCount');
  const productById = new Map(topProducts.map((p) => [String(p._id), p]));
  const topSelling = topIds
    .map((id) => {
      const row = salesByProduct.find((r) => String(r._id) === String(id));
      return { product: productById.get(String(id)), quantity: row.quantity, revenue: row.revenue };
    })
    .filter((row) => row.product);

  const recentDocs = await Order.find({ 'items.product': { $in: productIds } })
    .sort('-createdAt')
    .limit(5);
  const ownedItemIds = snapshotOwnedItems(recentDocs, ownedSet);
  await Order.populate(recentDocs, { path: 'user', select: 'name email' });
  await Order.populate(recentDocs, { path: 'items.product', select: 'name images price' });

  res.json({
    success: true,
    stats: {
      totalProducts,
      activeProducts,
      inactiveProducts: totalProducts - activeProducts,
      lowStockProducts,
      lowStockThreshold: LOW_STOCK_THRESHOLD,
      totalOrders,
      itemsSold,
      revenue,
      averageRating: artisan.rating || 0,
      reviewCount: artisan.reviewCount || 0,
      isVerified: artisan.isVerified,
      recentOrders: shapeOwnedOrders(recentDocs, ownedItemIds),
      topSelling
    }
  });
});

// GET /api/artisans/me/orders
// Read-only: order status stays with the customer/admin rules (see routes/orders.js
// and routes/admin.js) because orderStatus belongs to the whole order, not to one artisan.
export const getMyOrders = catchAsync(async (req, res) => {
  const artisan = await getOwnArtisan(req.user);
  const productIds = await ownProductIds(artisan._id);
  const ownedSet = new Set(productIds.map(String));

  const page = Number(req.query.page) > 0 ? Number(req.query.page) : 1;
  const limit = Number(req.query.limit) > 0 ? Number(req.query.limit) : 10;

  const query = { 'items.product': { $in: productIds } };
  if (req.query.orderStatus) query.orderStatus = req.query.orderStatus;

  const total = await Order.countDocuments(query);
  const docs = await Order.find(query)
    .sort('-createdAt')
    .skip((page - 1) * limit)
    .limit(limit);

  const ownedItemIds = snapshotOwnedItems(docs, ownedSet);
  await Order.populate(docs, { path: 'user', select: 'name email' });
  await Order.populate(docs, { path: 'items.product', select: 'name images price artisan' });

  res.json({
    success: true,
    orders: shapeOwnedOrders(docs, ownedItemIds),
    page,
    pages: Math.ceil(total / limit),
    total
  });
});
