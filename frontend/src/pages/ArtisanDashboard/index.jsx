import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { artisanService } from '../../services/artisanService';
import { toast, errMsg } from '../../components/Toast';
import { OrderStatusBadge } from '../../components/order/OrderStatus';
import { Loading, ErrorState, EmptyState } from '../../components/admin/AdminShell';
import ArtisanShell from '../../components/artisan/ArtisanShell';
import { inr } from '../../utils/format';

const formatDate = (value) =>
  new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

const ArtisanDashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await artisanService.myStats();
      setStats(res.data.stats);
    } catch (err) {
      const message = errMsg(err, 'Failed to load your dashboard');
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const cards = stats
    ? [
        { label: 'Products', value: stats.totalProducts, emoji: '📦', to: '/artisan/products' },
        { label: 'Active', value: stats.activeProducts, emoji: '✅', to: '/artisan/products' },
        { label: 'Low Stock', value: stats.lowStockProducts, emoji: '⚠️', to: '/artisan/products' },
        { label: 'Orders', value: stats.totalOrders, emoji: '🛒', to: '/artisan/orders' },
        { label: 'Items Sold', value: stats.itemsSold, emoji: '📊' },
        { label: 'Revenue', value: inr(stats.revenue), emoji: '💰' },
        {
          label: 'Rating',
          value: stats.averageRating > 0 ? `${Number(stats.averageRating).toFixed(1)} ★` : '—',
          emoji: '⭐'
        },
        { label: 'Reviews', value: stats.reviewCount, emoji: '💬' },
      ]
    : [];

  return (
    <ArtisanShell
      title={`Welcome, ${user?.name}!`}
      actions={
        <span
          className={`px-3 py-1 rounded-full text-sm font-medium ${
            stats?.isVerified ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
          }`}
        >
          {stats ? (stats.isVerified ? 'Verified Artisan' : 'Verification Pending') : '…'}
        </span>
      }
    >
      <p className="text-amber-700 mb-8">Artisan Dashboard</p>

        {loading && (
          <div className="mb-8">
            <Loading />
          </div>
        )}

        {!loading && error && (
          <div className="mb-8">
            <ErrorState message={error} />
            <div className="text-center mt-4">
              <button
                onClick={load}
                className="bg-amber-700 text-white px-6 py-2 rounded-lg hover:bg-amber-800 transition"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {!loading && !error && stats && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              {cards.map((stat) => {
                const inner = (
                  <>
                    <span className="text-3xl">{stat.emoji}</span>
                    <p className="text-2xl font-bold text-amber-900 mt-2">{stat.value}</p>
                    <p className="text-sm text-amber-600">{stat.label}</p>
                  </>
                );
                return stat.to ? (
                  <Link
                    key={stat.label}
                    to={stat.to}
                    className="bg-white rounded-xl shadow-md p-4 text-center hover:shadow-lg transition"
                  >
                    {inner}
                  </Link>
                ) : (
                  <div key={stat.label} className="bg-white rounded-xl shadow-md p-4 text-center">
                    {inner}
                  </div>
                );
              })}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="bg-white rounded-xl shadow-md p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-bold text-amber-900">Quick Actions</h2>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Link
                    to="/artisan/products"
                    className="bg-amber-100 text-amber-800 p-4 rounded-lg hover:bg-amber-200 transition text-center"
                  >
                    My Products
                  </Link>
                  <Link
                    to="/artisan/orders"
                    className="bg-amber-100 text-amber-800 p-4 rounded-lg hover:bg-amber-200 transition text-center"
                  >
                    My Orders
                  </Link>
                  <Link
                    to="/artisan/profile"
                    className="bg-amber-100 text-amber-800 p-4 rounded-lg hover:bg-amber-200 transition text-center"
                  >
                    Edit Profile
                  </Link>
                  <Link
                    to="/artisans"
                    className="bg-amber-100 text-amber-800 p-4 rounded-lg hover:bg-amber-200 transition text-center"
                  >
                    View Shop
                  </Link>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-md p-6">
                <h2 className="font-bold text-amber-900 mb-4">Recent Orders</h2>
                {stats.recentOrders.length === 0 ? (
                  <EmptyState message="No orders containing your products yet" />
                ) : (
                  <div className="space-y-3">
                    {stats.recentOrders.map((order) => (
                      <div
                        key={order._id}
                        className="flex items-center justify-between gap-3 border-b border-amber-50 pb-3 last:border-0 last:pb-0"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-amber-900 truncate">
                            #{String(order._id).slice(-6).toUpperCase()} · {order.customer?.name || 'Customer'}
                          </p>
                          <p className="text-xs text-amber-600">
                            {formatDate(order.createdAt)} · {order.itemCount} item
                            {order.itemCount === 1 ? '' : 's'} · {inr(order.itemsTotal)}
                          </p>
                        </div>
                        <OrderStatusBadge status={order.orderStatus} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-md p-6 mb-8">
              <h2 className="font-bold text-amber-900 mb-4">Top Products</h2>
              {stats.topSelling.length === 0 ? (
                <EmptyState message="Nothing sold yet — your best sellers will show up here" />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {stats.topSelling.map((row) => (
                    <div key={row.product._id} className="bg-amber-50 rounded-lg p-4 flex items-center gap-3">
                      <div className="w-14 h-14 rounded-lg bg-amber-100 overflow-hidden flex items-center justify-center shrink-0">
                        {row.product.images?.[0] ? (
                          <img
                            src={row.product.images[0]}
                            alt={row.product.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-2xl">🏺</span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-amber-900 truncate">{row.product.name}</p>
                        <p className="text-sm text-amber-700">
                          {row.quantity} sold · {inr(row.revenue)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white rounded-xl shadow-md p-6">
              <h2 className="font-bold text-amber-900 mb-4">Performance</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-amber-50 rounded-lg p-4">
                  <h3 className="font-medium text-amber-900">Revenue from your items</h3>
                  <p className="text-2xl font-bold text-amber-700 mt-2">{inr(stats.revenue)}</p>
                </div>
                <div className="bg-amber-50 rounded-lg p-4">
                  <h3 className="font-medium text-amber-900">Products Listed</h3>
                  <p className="text-2xl font-bold text-amber-700 mt-2">
                    {stats.activeProducts} / {stats.totalProducts} active
                  </p>
                </div>
                <div className="bg-amber-50 rounded-lg p-4">
                  <h3 className="font-medium text-amber-900">Low Stock Alerts</h3>
                  <p className="text-2xl font-bold text-amber-700 mt-2">
                    {stats.lowStockProducts} ≤ {stats.lowStockThreshold}
                  </p>
                </div>
              </div>
            </div>
          </>
        )}
    </ArtisanShell>
  );
};

export default ArtisanDashboard;
