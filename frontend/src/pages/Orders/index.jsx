import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { orderService } from '../../services/orderService';
import { toast, errMsg } from '../../components/Toast';
import { OrderStatusBadge, PaymentStatusBadge } from '../../components/order/OrderStatus';
import { inr } from '../../utils/format';

function Orders() {
  const [orders, setOrders] = useState([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    try {
      const res = await orderService.getAll({ page, limit: 10 });
      setOrders(res.data.orders || []);
      setPages(res.data.pages || 0);
      setError(null);
    } catch (err) {
      const message = errMsg(err, 'Failed to load your orders');
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    load();
  }, [load]);

  // Show the skeleton while (re)loading — called from event handlers only.
  const reload = () => {
    if (loading) return;
    setLoading(true);
    load();
  };

  const goToPage = (nextPage) => {
    if (loading || nextPage === page) return;
    setLoading(true);
    setPage(nextPage);
  };

  const formatDate = (value) =>
    new Date(value).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });

  return (
    <div className="min-h-screen bg-amber-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-2xl font-bold text-amber-900 mb-8">My Orders</h1>

        {loading && (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-white rounded-xl shadow-md p-6 animate-pulse">
                <div className="h-4 bg-amber-100 rounded w-1/4" />
                <div className="h-4 bg-amber-100 rounded w-1/3 mt-3" />
                <div className="h-6 bg-amber-100 rounded w-1/4 mt-3" />
              </div>
            ))}
          </div>
        )}

        {!loading && error && (
          <div className="bg-white rounded-xl shadow-md p-12 text-center">
            <span className="text-6xl">⚠️</span>
            <h2 className="text-xl font-semibold text-amber-900 mt-4">Could not load your orders</h2>
            <p className="text-amber-600 mt-2">{error}</p>
            <button
              onClick={reload}
              className="mt-4 bg-amber-700 text-white px-6 py-2 rounded-lg hover:bg-amber-800 transition"
            >
              Retry
            </button>
          </div>
        )}

        {!loading && !error && orders.length === 0 && (
          <div className="bg-white rounded-xl shadow-md p-12 text-center">
            <span className="text-6xl">📦</span>
            <h2 className="text-xl font-semibold text-amber-900 mt-4">No orders yet</h2>
            <p className="text-amber-600 mt-2">When you place an order it will show up here.</p>
            <Link
              to="/products"
              className="inline-block mt-4 bg-amber-700 text-white px-6 py-2 rounded-lg hover:bg-amber-800 transition"
            >
              Browse Products
            </Link>
          </div>
        )}

        {!loading && !error && orders.length > 0 && (
          <>
            <div className="space-y-4">
              {orders.map((order) => (
                <div key={order._id} className="bg-white rounded-xl shadow-md p-6">
                  <div className="flex flex-col md:flex-row justify-between gap-4">
                    <div>
                      <p className="text-sm text-amber-600">
                        Order #{String(order._id).slice(-6).toUpperCase()}
                      </p>
                      <p className="text-sm text-amber-600 mt-1">
                        Placed on {formatDate(order.createdAt)}
                      </p>
                      <p className="text-sm text-amber-600 mt-1">
                        {(order.items || []).length} item
                        {(order.items || []).length === 1 ? '' : 's'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-amber-900">{inr(order.total)}</p>
                      <div className="flex flex-wrap gap-2 justify-end mt-2">
                        <OrderStatusBadge status={order.orderStatus} />
                        <PaymentStatusBadge status={order.paymentStatus} />
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-4 mt-4">
                    <Link
                      to={`/order/${order._id}`}
                      className="text-amber-700 hover:text-amber-900 font-medium text-sm"
                    >
                      View Details →
                    </Link>
                  </div>
                </div>
              ))}
            </div>

            {pages > 1 && (
              <div className="flex items-center justify-center gap-4 mt-6">
                <button
                  onClick={() => goToPage(Math.max(1, page - 1))}
                  disabled={page <= 1}
                  className="px-4 py-2 bg-white border border-amber-300 rounded-lg text-amber-800 text-sm disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="text-sm text-amber-700">
                  Page {page} of {pages}
                </span>
                <button
                  onClick={() => goToPage(Math.min(pages, page + 1))}
                  disabled={page >= pages}
                  className="px-4 py-2 bg-white border border-amber-300 rounded-lg text-amber-800 text-sm disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default Orders;
