import { useCallback, useEffect, useState } from 'react';
import ArtisanShell from '../../components/artisan/ArtisanShell';
import { Loading, ErrorState, EmptyState, Pager } from '../../components/admin/AdminShell';
import { toast, errMsg } from '../../components/Toast';
import { OrderStatusBadge, PaymentStatusBadge } from '../../components/order/OrderStatus';
import { artisanService } from '../../services/artisanService';
import { inr } from '../../utils/format';

const ORDER_STATUSES = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];

const formatDate = (value) =>
  new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

function ArtisanOrders() {
  const [orders, setOrders] = useState([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(0);
  const [total, setTotal] = useState(0);
  const [orderStatus, setOrderStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = { page, limit: 10 };
      if (orderStatus) params.orderStatus = orderStatus;
      const res = await artisanService.myOrders(params);
      setOrders(res.data.orders || []);
      setPages(res.data.pages || 0);
      setTotal(res.data.total || 0);
    } catch (err) {
      const message = errMsg(err, 'Failed to load your orders');
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [page, orderStatus]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <ArtisanShell
      title="My Orders"
      actions={<span className="text-sm text-amber-600">{total} orders</span>}
    >
      <div className="bg-white rounded-xl shadow-md p-4 mb-4 flex flex-wrap gap-3 items-center">
        <select
          value={orderStatus}
          onChange={(e) => {
            setOrderStatus(e.target.value);
            setPage(1);
          }}
          className="border border-amber-200 rounded-lg px-3 py-2 text-sm"
        >
          <option value="">All order statuses</option>
          {ORDER_STATUSES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <button onClick={load} className="px-4 py-2 bg-amber-100 text-amber-800 rounded-lg text-sm">
          Refresh
        </button>
        <p className="text-xs text-amber-600 flex-1 min-w-64">
          These are orders that contain your products. Order status is managed by the customer and
          CraftVeda support — only your own line items are shown.
        </p>
      </div>

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
      {!loading && !error && orders.length === 0 && (
        <EmptyState
          message={orderStatus ? `No ${orderStatus} orders with your products` : 'No orders contain your products yet'}
        />
      )}

      {!loading && !error && orders.length > 0 && (
        <div className="space-y-4">
          {orders.map((order) => (
            <div key={order._id} className="bg-white rounded-xl shadow-md p-6">
              <div className="flex flex-col md:flex-row justify-between gap-4">
                <div>
                  <p className="text-sm text-amber-600">
                    Order #{String(order._id).slice(-6).toUpperCase()}
                  </p>
                  <p className="text-sm text-amber-600 mt-1">
                    {order.customer?.name || 'Customer'}
                    {order.customer?.email ? ` · ${order.customer.email}` : ''}
                  </p>
                  <p className="text-sm text-amber-600 mt-1">{formatDate(order.createdAt)}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-amber-500">Your items</p>
                  <p className="font-bold text-amber-900">{inr(order.itemsTotal)}</p>
                  <div className="flex flex-wrap gap-2 justify-end mt-2">
                    <OrderStatusBadge status={order.orderStatus} />
                    <PaymentStatusBadge status={order.paymentStatus} />
                  </div>
                </div>
              </div>

              <ul className="mt-4 divide-y divide-amber-50">
                {(order.items || []).map((item) => (
                  <li key={item._id} className="py-3 flex items-center gap-3">
                    <div className="w-10 h-10 rounded bg-amber-100 overflow-hidden flex items-center justify-center shrink-0">
                      {item.product?.images?.[0] ? (
                        <img
                          src={item.product.images[0]}
                          alt={item.product?.name || 'product'}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span>🏺</span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-amber-900 truncate">
                        {item.product?.name || 'Product'}
                      </p>
                      <p className="text-xs text-amber-600">
                        {item.quantity} × {inr(item.price)}
                      </p>
                    </div>
                    <p className="text-sm font-medium text-amber-900">
                      {inr(item.price * item.quantity)}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      <Pager page={page} pages={pages} onChange={setPage} />
    </ArtisanShell>
  );
}

export default ArtisanOrders;
