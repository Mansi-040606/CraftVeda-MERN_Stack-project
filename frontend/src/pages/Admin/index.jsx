import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import adminApi from '../../services/adminApi';
import { toast, errMsg } from '../../components/Toast';
import { AdminShell, Loading, ErrorState } from '../../components/admin/AdminShell';

const inr = (value) => `₹${Number(value || 0).toLocaleString('en-IN')}`;

function Admin() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminApi.stats();
      setStats(res.data.stats);
    } catch (err) {
      const message = errMsg(err, 'Failed to load stats');
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
        { label: 'Users', value: stats.users },
        { label: 'Orders', value: stats.orders },
        { label: 'Products', value: stats.products },
        { label: 'Artisans', value: stats.artisans },
        { label: 'Donations', value: inr(stats.totalDonations) },
        { label: 'Revenue', value: inr(stats.revenue) },
      ]
    : [];

  return (
    <AdminShell title="Admin Dashboard">
      {loading && <Loading />}
      {!loading && error && (
        <div>
          <ErrorState message={error} />
          <div className="text-center mt-4">
            <button onClick={load} className="px-4 py-2 bg-amber-700 text-white rounded-lg text-sm">
              Retry
            </button>
          </div>
        </div>
      )}
      {!loading && !error && stats && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
            {cards.map((stat) => (
              <div key={stat.label} className="bg-white rounded-xl shadow-md p-4 text-center">
                <p className="text-xl font-bold text-amber-900 mt-2 break-words">{stat.value}</p>
                <p className="text-sm text-amber-600">{stat.label}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="bg-white rounded-xl shadow-md p-6">
              <h2 className="font-bold text-amber-900 mb-4">Quick Actions</h2>
              <div className="grid grid-cols-2 gap-4">
                <Link to="/admin/products" className="bg-amber-100 text-amber-800 p-4 rounded-lg hover:bg-amber-200 transition text-center">
                  Manage Products
                </Link>
                <Link to="/admin/applications" className="bg-amber-100 text-amber-800 p-4 rounded-lg hover:bg-amber-200 transition text-center">
                  Artisan Applications ({stats.pendingApplications || 0} pending)
                </Link>
                <Link to="/admin/orders" className="bg-amber-100 text-amber-800 p-4 rounded-lg hover:bg-amber-200 transition text-center">
                  Manage Orders
                </Link>
                <Link to="/admin/users" className="bg-amber-100 text-amber-800 p-4 rounded-lg hover:bg-amber-200 transition text-center">
                  Manage Users
                </Link>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-md p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="font-bold text-amber-900">Recent Orders</h2>
                <button onClick={load} className="text-sm text-amber-700 hover:text-amber-900">
                  Refresh
                </button>
              </div>
              <div className="space-y-3">
                {(stats.recentOrders || []).length === 0 && (
                  <p className="text-sm text-amber-600">No orders yet</p>
                )}
                {(stats.recentOrders || []).map((order) => (
                  <div key={order._id} className="flex justify-between items-center border-b border-amber-100 pb-2">
                    <div>
                      <p className="font-medium text-amber-900">#{String(order._id).slice(-6).toUpperCase()}</p>
                      <p className="text-sm text-amber-600">{order.user?.name || 'Unknown'} · {order.user?.email}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-amber-900">{inr(order.total)}</p>
                      <p className="text-xs text-amber-600">{order.orderStatus}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6">
            <h2 className="font-bold text-amber-900 mb-4">Latest Products</h2>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {(stats.topProducts || []).map((product) => (
                <div key={product._id} className="bg-amber-50 rounded-lg p-3 text-center">
                  <p className="text-sm font-medium text-amber-900 line-clamp-2">{product.name}</p>
                  <p className="text-xs text-amber-600 mt-1">{inr(product.price)} · stock {product.stock}</p>
                </div>
              ))}
              {(stats.topProducts || []).length === 0 && (
                <p className="text-sm text-amber-600">No products yet</p>
              )}
            </div>
          </div>
        </>
      )}
    </AdminShell>
  );
}

export default Admin;
