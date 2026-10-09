import { useCallback, useEffect, useState } from 'react';
import adminApi from '../../services/adminApi';
import { toast, errMsg } from '../../components/Toast';
import { AdminShell, Loading, ErrorState, EmptyState, Pager } from '../../components/admin/AdminShell';

const ORDER_STATUSES = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];
const PAYMENT_STATUSES = ['pending', 'paid', 'failed', 'refunded'];
const inr = (value) => `₹${Number(value || 0).toLocaleString('en-IN')}`;

function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(0);
  const [total, setTotal] = useState(0);
  const [orderStatus, setOrderStatus] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = { page, limit: 10 };
      if (orderStatus) params.orderStatus = orderStatus;
      if (paymentStatus) params.paymentStatus = paymentStatus;
      const res = await adminApi.orders(params);
      setOrders(res.data.orders || []);
      setPages(res.data.pages || 0);
      setTotal(res.data.total || 0);
    } catch (err) {
      const message = errMsg(err, 'Failed to load orders');
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [page, orderStatus, paymentStatus]);

  useEffect(() => {
    load();
  }, [load]);

  const changeStatus = async (order, status) => {
    setBusyId(order._id);
    try {
      await adminApi.updateOrderStatus(order._id, status);
      toast.success(`Order marked ${status}`);
      load();
    } catch (err) {
      toast.error(errMsg(err, 'Failed to update order status'));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <AdminShell title="Orders">
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
        <select
          value={paymentStatus}
          onChange={(e) => {
            setPaymentStatus(e.target.value);
            setPage(1);
          }}
          className="border border-amber-200 rounded-lg px-3 py-2 text-sm"
        >
          <option value="">All payment statuses</option>
          {PAYMENT_STATUSES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <button onClick={load} className="px-4 py-2 bg-amber-700 text-white rounded-lg text-sm">
          Refresh
        </button>
        <span className="text-sm text-amber-600">{total} orders</span>
      </div>

      {loading && <Loading />}
      {!loading && error && <ErrorState message={error} />}
      {!loading && !error && orders.length === 0 && <EmptyState message="No orders found" />}

      {!loading && !error && orders.length > 0 && (
        <div className="bg-white rounded-xl shadow-md overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-amber-600 border-b border-amber-100">
                <th className="p-3">Order</th>
                <th className="p-3">Customer</th>
                <th className="p-3">Items</th>
                <th className="p-3">Total</th>
                <th className="p-3">Payment</th>
                <th className="p-3">Status</th>
                <th className="p-3">Update</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order._id} className="border-b border-amber-50">
                  <td className="p-3 font-medium text-amber-900">
                    #{String(order._id).slice(-6).toUpperCase()}
                    <span className="block text-xs text-amber-500">
                      {new Date(order.createdAt).toLocaleDateString()}
                    </span>
                  </td>
                  <td className="p-3 text-amber-700">
                    {order.user?.name || 'Unknown'}
                    <span className="block text-xs text-amber-500">{order.user?.email}</span>
                  </td>
                  <td className="p-3 text-amber-700">{(order.items || []).length}</td>
                  <td className="p-3 font-medium text-amber-900">{inr(order.total)}</td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded text-xs ${order.paymentStatus === 'paid' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
                      {order.paymentStatus}
                    </span>
                  </td>
                  <td className="p-3">
                    <span className="px-2 py-1 rounded text-xs bg-amber-100 text-amber-800">{order.orderStatus}</span>
                  </td>
                  <td className="p-3">
                    <div className="flex gap-2">
                      <select
                        value={order.orderStatus}
                        disabled={busyId === order._id}
                        onChange={(e) => changeStatus(order, e.target.value)}
                        className="border border-amber-200 rounded px-2 py-1"
                      >
                        {ORDER_STATUSES.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Pager page={page} pages={pages} onChange={setPage} />
    </AdminShell>
  );
}

export default AdminOrders;
