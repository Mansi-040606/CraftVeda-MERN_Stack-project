import User from '../models/User.js';
import Order from '../models/Order.js';
import catchAsync from '../utils/catchAsync.js';

const DEFAULT_MONTHS = 6;
const CHART_ROLES = ['CUSTOMER', 'ARTISAN'];

// Month buckets for the last `months` months, oldest first (UTC, matching the
// aggregation's $dateToString output). Months are built even when empty so the
// chart can be zero-filled with no gaps.
const buildBuckets = (months) => {
  const now = new Date();
  const buckets = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    const year = d.getUTCFullYear();
    const month = d.getUTCMonth() + 1;
    buckets.push({ key: `${year}-${String(month).padStart(2, '0')}` });
  }
  return buckets;
};

// All five queries share one window: from the first day of the oldest bucket.
const windowStart = (buckets) => {
  const [year, month] = buckets[0].key.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, 1));
};

// GET /api/admin/stats/timeseries?months=N
export const getTimeSeries = catchAsync(async (req, res) => {
  const months = Number.isInteger(req.query.months) ? req.query.months : DEFAULT_MONTHS;
  const buckets = buildBuckets(months);
  const start = windowStart(buckets);
  const byMonth = { $dateToString: { format: '%Y-%m', date: '$createdAt' } };

  const [monthlyOrders, monthlyUsers, ordersByStatus, topCategories, topArtisans] = await Promise.all([
    Order.aggregate([
      { $match: { createdAt: { $gte: start } } },
      { $group: {
        _id: byMonth,
        orders: { $sum: 1 },
        revenue: { $sum: { $cond: [{ $eq: ['$orderStatus', 'cancelled'] }, 0, '$total'] } }
      } }
    ]),
    User.aggregate([
      { $match: { createdAt: { $gte: start }, role: { $in: CHART_ROLES } } },
      { $group: { _id: byMonth, newUsers: { $sum: 1 } } }
    ]),
    Order.aggregate([
      { $match: { createdAt: { $gte: start } } },
      { $group: { _id: '$orderStatus', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $project: { _id: 0, status: '$_id', count: 1 } }
    ]),
    Order.aggregate([
      { $match: { createdAt: { $gte: start }, orderStatus: { $ne: 'cancelled' } } },
      { $unwind: '$items' },
      { $lookup: { from: 'products', localField: 'items.product', foreignField: '_id', as: 'product' } },
      { $unwind: '$product' },
      { $group: {
        _id: '$product.category',
        revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } },
        itemsSold: { $sum: '$items.quantity' }
      } },
      { $sort: { revenue: -1, itemsSold: -1 } },
      { $limit: 5 },
      { $project: { _id: 0, category: '$_id', revenue: 1, itemsSold: 1 } }
    ]),
    Order.aggregate([
      { $match: { createdAt: { $gte: start }, orderStatus: { $ne: 'cancelled' } } },
      { $unwind: '$items' },
      { $lookup: { from: 'products', localField: 'items.product', foreignField: '_id', as: 'product' } },
      { $unwind: '$product' },
      { $group: {
        _id: '$product.artisan',
        revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } },
        itemsSold: { $sum: '$items.quantity' }
      } },
      { $sort: { revenue: -1, itemsSold: -1 } },
      { $limit: 5 },
      { $lookup: { from: 'artisans', localField: '_id', foreignField: '_id', as: 'artisan' } },
      { $project: {
        _id: 0,
        artisanId: '$_id',
        name: { $ifNull: [{ $arrayElemAt: ['$artisan.businessName', 0] }, 'Unknown artisan'] },
        revenue: 1,
        itemsSold: 1
      } }
    ])
  ]);

  const ordersByMonth = new Map(monthlyOrders.map((row) => [row._id, row]));
  const usersByMonth = new Map(monthlyUsers.map((row) => [row._id, row]));

  res.json({
    success: true,
    months,
    timeline: buckets.map((bucket) => {
      const ordersRow = ordersByMonth.get(bucket.key);
      const usersRow = usersByMonth.get(bucket.key);
      return {
        key: bucket.key,
        revenue: ordersRow?.revenue || 0,
        orders: ordersRow?.orders || 0,
        newUsers: usersRow?.newUsers || 0
      };
    }),
    ordersByStatus,
    topCategories,
    topArtisans
  });
});
