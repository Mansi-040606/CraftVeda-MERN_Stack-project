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
  const [editingTracking, setEditingTracking] = useState(null);
  const [trackingForm, setTrackingForm] = useState({ trackingNumber: '', trackingUrl: '' });

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

  const openTracking = (order) => {
    setEditingTracking(order);
    setTrackingForm({
      trackingNumber: order.trackingNumber || '',
      trackingUrl: order.trackingUrl || '',
    });
  };

  const saveTracking = async (e) => {
    e.preventDefault();
    if (!editingTracking) return;
    setBusyId(editingTracking._id);
    try {
      await adminApi.updateOrderStatus(editingTracking._id, {
        orderStatus: editingTracking.orderStatus,
        trackingNumber: trackingForm.trackingNumber.trim(),
        trackingUrl: trackingForm.trackingUrl.trim(),
      });
      toast.success('Tracking details saved');
      setEditingTracking(null);
      load();
    } catch (err) {
      toast.error(errMsg(err, 'Failed to save tracking details'));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <AdminShell title="Orders">
      <div className="bg-white rounded-sm border border-ink/10 p-4 mb-4 flex flex-wrap gap-3 items-center">
        <select
          value={orderStatus}
          onChange={(e) => {
            setOrderStatus(e.target.value);
            setPage(1);
          }}
          className="border border-ink/10 rounded-sm px-3 py-2 text-sm"
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
          className="border border-ink/10 rounded-sm px-3 py-2 text-sm"
        >
          <option value="">All payment statuses</option>
          {PAYMENT_STATUSES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <button onClick={load} className="px-4 py-2 bg-terracotta text-white rounded-sm text-sm">
          Refresh
        </button>
        <span className="text-sm text-ink-soft">{total} orders</span>
      </div>

      {loading && <Loading />}
      {!loading && error && <ErrorState message={error} />}
      {!loading && !error && orders.length === 0 && <EmptyState message="No orders found" />}

      {editingTracking && (
        <form onSubmit={saveTracking} className="bg-white rounded-sm border border-ink/10 p-4 mb-4 flex flex-wrap gap-3 items-end">
          <div className="min-w-44">
            <p className="text-xs font-semibold text-ink mb-1">
              Tracking for #{String(editingTracking._id).slice(-6).toUpperCase()}
            </p>
            <input
              value={trackingForm.trackingNumber}
              onChange={(e) => setTrackingForm((f) => ({ ...f, trackingNumber: e.target.value }))}
              placeholder="Tracking number"
              className="w-full border border-ink/10 rounded-sm px-3 py-2 text-sm"
            />
          </div>
          <div className="flex-1 min-w-56">
            <p className="text-xs text-ink-soft mb-1">Tracking URL (optional)</p>
            <input
              value={trackingForm.trackingUrl}
              onChange={(e) => setTrackingForm((f) => ({ ...f, trackingUrl: e.target.value }))}
              placeholder="https://carrier.example/track/..."
              className="w-full border border-ink/10 rounded-sm px-3 py-2 text-sm"
            />
          </div>
          <button
            type="submit"
            disabled={busyId === editingTracking._id}
            className="px-4 py-2 bg-terracotta text-white rounded-sm text-sm disabled:opacity-50"
          >
            Save Tracking
          </button>
          <button
            type="button"
            onClick={() => setEditingTracking(null)}
            className="px-4 py-2 bg-parchment text-ink-soft rounded-sm text-sm"
          >
            Cancel
          </button>
        </form>
      )}

      {!loading && !error && orders.length > 0 && (
        <div className="bg-white rounded-sm border border-ink/10 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-ink-soft border-b border-ink/10">
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
                <tr key={order._id} className="border-b border-ink/5">
                  <td className="p-3 font-medium text-ink">
                    #{String(order._id).slice(-6).toUpperCase()}
                    <span className="block text-xs text-ink-faint">
                      {new Date(order.createdAt).toLocaleDateString()}
                    </span>
                  </td>
                  <td className="p-3 text-terracotta-dark">
                    {order.user?.name || 'Unknown'}
                    <span className="block text-xs text-ink-faint">{order.user?.email}</span>
                  </td>
                  <td className="p-3 text-terracotta-dark">{(order.items || []).length}</td>
                  <td className="p-3 font-medium text-ink">{inr(order.total)}</td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded text-xs ${order.paymentStatus === 'paid' ? 'bg-green-100 text-green-800' : 'bg-parchment text-ink-soft'}`}>
                      {order.paymentStatus}
                    </span>
                  </td>
                  <td className="p-3">
                    <span className="px-2 py-1 rounded text-xs bg-parchment text-ink-soft">{order.orderStatus}</span>
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <select
                        value={order.orderStatus}
                        disabled={busyId === order._id}
                        onChange={(e) => changeStatus(order, e.target.value)}
                        className="border border-ink/10 rounded px-2 py-1"
                      >
                        {ORDER_STATUSES.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => openTracking(order)}
                        className="text-xs text-terracotta-dark hover:underline whitespace-nowrap"
                      >
                        {order.trackingNumber ? 'Edit tracking' : '+ Tracking'}
                      </button>
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
