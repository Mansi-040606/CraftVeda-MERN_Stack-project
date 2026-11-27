import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { orderService } from '../../services/orderService';
import { certificateService } from '../../services/certificateService';
import { useCart } from '../../context/CartContext';
import { toast, errMsg } from '../../components/Toast';
import { OrderStatusBadge, PaymentStatusBadge } from '../../components/order/OrderStatus';
import ProductImage from '../../components/product/ProductImage';
import { inr } from '../../utils/format';

const ORDER_STATUS_FLOW = ['pending', 'confirmed', 'processing', 'shipped', 'delivered'];

const PAYMENT_METHOD_LABELS = {
  cod: 'Cash on Delivery',
  card: 'Card (Razorpay)',
  upi: 'UPI (Razorpay)',
  netbanking: 'Net Banking (Razorpay)',
  wallet: 'Wallet (Razorpay)',
};

const formatDate = (value) =>
  new Date(value).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

function OrderDetail() {
  const { id } = useParams();
  const { reload } = useCart();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [cancelling, setCancelling] = useState(false);
  const [certificates, setCertificates] = useState([]);
  const [generatingFor, setGeneratingFor] = useState(null);

  const load = useCallback(async () => {
    try {
      const res = await orderService.getById(id);
      const loadedOrder = res.data.order;
      setOrder(loadedOrder);
      setError(null);
      if (loadedOrder?.orderStatus === 'delivered') {
        try {
          const certRes = await certificateService.getByOrder(id);
          setCertificates(certRes.data.certificates || []);
        } catch {
          setCertificates([]);
        }
      } else {
        setCertificates([]);
      }
    } catch (err) {
      setError(errMsg(err, 'Failed to load this order'));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  // Retry from the error state (event handler, so the skeleton may be set here).
  const retry = () => {
    setLoading(true);
    load();
  };

  // Backend rule: shipped / delivered / cancelled orders can no longer be cancelled.
  const canCancel =
    order && !['shipped', 'delivered', 'cancelled'].includes(order.orderStatus);

  const handleCancel = async () => {
    if (!window.confirm('Cancel this order? This cannot be undone.')) return;
    setCancelling(true);
    try {
      await orderService.cancel(id);
      toast.success('Order cancelled');
      // Stock goes back to the products → refresh the cart context.
      reload();
      // The cancel response has unpopulated items → refetch the full order.
      await load();
    } catch (err) {
      toast.error(errMsg(err, 'Could not cancel this order'));
    } finally {
      setCancelling(false);
    }
  };

  const handleGenerateCertificate = async (productId) => {
    setGeneratingFor(productId);
    try {
      const res = await certificateService.generate(order._id, productId);
      const created = res.data.certificate;
      if (created) {
        setCertificates((prev) => [...prev, created]);
      }
      toast.success('Authenticity certificate generated');
    } catch (err) {
      toast.error(errMsg(err, 'Could not generate certificate'));
    } finally {
      setGeneratingFor(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-cream py-8">
        <div className="max-w-4xl mx-auto px-4 space-y-6">
          <div className="bg-white rounded-sm border border-ink/10 p-6 h-32 animate-pulse" />
          <div className="bg-white rounded-sm border border-ink/10 p-6 h-64 animate-pulse" />
          <div className="bg-white rounded-sm border border-ink/10 p-6 h-48 animate-pulse" />
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-cream py-8">
        <div className="max-w-2xl mx-auto px-4">
          <div className="bg-white rounded-sm border border-ink/10 p-12 text-center">
            <span className="text-6xl">⚠️</span>
            <h2 className="text-xl font-semibold text-ink mt-4">
              {error?.includes('not found') ? 'Order not found' : 'Could not load this order'}
            </h2>
            <p className="text-ink-soft mt-2">{error || 'This order does not exist.'}</p>
            <div className="flex flex-wrap gap-4 justify-center mt-4">
              <button
                onClick={retry}
                className="bg-terracotta text-white px-6 py-2 rounded-sm hover:bg-terracotta-dark transition"
              >
                Try Again
              </button>
              <Link
                to="/orders"
                className="bg-white border border-ink/15 text-ink-soft px-6 py-2 rounded-sm hover:bg-parchment transition"
              >
                Back to My Orders
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const currentIndex = ORDER_STATUS_FLOW.indexOf(order.orderStatus);
  const isCancelled = order.orderStatus === 'cancelled';

  return (
    <div className="min-h-screen bg-cream py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-ink">
              Order #{String(order._id).slice(-6).toUpperCase()}
            </h1>
            <p className="text-sm text-ink-soft mt-1">Placed on {formatDate(order.createdAt)}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <OrderStatusBadge status={order.orderStatus} />
            <PaymentStatusBadge status={order.paymentStatus} />
          </div>
        </div>

        {/* ----- status timeline ----- */}
        <div className="bg-white rounded-sm border border-ink/10 p-6 mb-6">
          <h2 className="font-bold text-ink mb-4">Order Status</h2>

          {isCancelled ? (
            <div className="bg-red-50 border border-red-200 rounded-sm p-4 text-sm text-red-700">
              This order was cancelled on {formatDate(order.updatedAt || order.createdAt)}.
            </div>
          ) : (
            <ol className="flex flex-col md:flex-row gap-4">
              {ORDER_STATUS_FLOW.map((step, index) => {
                const done = index < currentIndex;
                const current = index === currentIndex;
                return (
                  <li key={step} className="flex md:flex-col items-center gap-3 md:flex-1">
                    <span
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                        done || current
                          ? 'bg-terracotta text-white'
                          : 'bg-parchment text-ink-faint'
                      }`}
                    >
                      {done ? '✓' : index + 1}
                    </span>
                    <div>
                      <p
                        className={`text-sm font-medium ${
                          done || current ? 'text-ink' : 'text-ink-faint'
                        }`}
                      >
                        {step.charAt(0).toUpperCase() + step.slice(1)}
                      </p>
                      {current && <p className="text-xs text-ink-soft">Current status</p>}
                    </div>
                  </li>
                );
              })}
            </ol>
          )}

          {canCancel && (
            <div className="border-t border-ink/10 mt-5 pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <p className="text-sm text-ink-soft">
                Changed your mind? You can cancel while the order is being prepared.
              </p>
              <button
                onClick={handleCancel}
                disabled={cancelling}
                className="px-4 py-2 border border-red-400 text-red-600 rounded-sm text-sm hover:bg-red-50 transition disabled:opacity-50"
              >
                {cancelling ? 'Cancelling…' : 'Cancel Order'}
              </button>
            </div>
          )}
        </div>

        {/* ----- items ----- */}
        <div className="bg-white rounded-sm border border-ink/10 p-6 mb-6">
          <h2 className="font-bold text-ink mb-4">Items</h2>
          <div className="divide-y divide-ink/10">
            {(order.items || []).map((item, index) => (
              <div key={item.product?._id || index} className="flex gap-4 py-4 first:pt-0 last:pb-0">
                <div className="bg-parchment rounded-sm w-16 h-16 flex items-center justify-center text-2xl overflow-hidden flex-shrink-0">
                  <ProductImage
                    src={item.product?.images?.[0]}
                    alt={item.product?.name || 'Product'}
                    frame="h-full w-full"
                    preset="thumb_140"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-ink truncate">
                    {item.product ? (
                      <Link to={`/product/${item.product._id}`} className="hover:text-terracotta-dark">
                        {item.product.name}
                      </Link>
                    ) : (
                      'Product unavailable'
                    )}
                  </p>
                  <p className="text-sm text-ink-soft">
                    {inr(item.price)} × {item.quantity}
                  </p>
                  {item.customization?.value && (
                    <p className="text-xs text-ink-soft mt-1">
                      {item.customization.option}: {item.customization.value}
                    </p>
                  )}
                </div>
                <p className="font-semibold text-ink">{inr(item.price * item.quantity)}</p>
              </div>
            ))}
          </div>

          <div className="border-t border-ink/10 mt-4 pt-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-terracotta-dark">Subtotal</span>
              <span className="text-ink">{inr(order.subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-terracotta-dark">Shipping</span>
              <span className="text-ink">
                {order.shippingCost === 0 ? 'FREE' : inr(order.shippingCost)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-terracotta-dark">Tax (GST)</span>
              <span className="text-ink">{inr(order.tax)}</span>
            </div>
            <div className="border-t border-ink/10 pt-2 flex justify-between font-bold text-base">
              <span className="text-ink">Total</span>
              <span className="text-ink">{inr(order.total)}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* ----- shipping address ----- */}
          <div className="bg-white rounded-sm border border-ink/10 p-6">
            <h2 className="font-bold text-ink mb-4">Shipping Address</h2>
            <p className="text-sm text-terracotta-dark leading-relaxed">
              {order.shippingAddress?.street}
              <br />
              {order.shippingAddress?.city}, {order.shippingAddress?.state}{' '}
              {order.shippingAddress?.pincode}
              <br />
              {order.shippingAddress?.country}
            </p>
            {order.trackingNumber && (
              <p className="text-sm text-terracotta-dark mt-4">
                <span className="font-semibold">Tracking:</span> {order.trackingNumber}
                {order.trackingUrl && (
                  <>
                    {' · '}
                    <a
                      href={order.trackingUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="underline text-ink hover:text-terracotta-dark"
                    >
                      Track shipment →
                    </a>
                  </>
                )}
              </p>
            )}
            {!order.trackingNumber && order.trackingUrl && (
              <p className="text-sm text-terracotta-dark mt-4">
                <a
                  href={order.trackingUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="underline text-ink hover:text-terracotta-dark"
                >
                  Track shipment →
                </a>
              </p>
            )}
            {order.notes && (
              <p className="text-sm text-terracotta-dark mt-4">
                <span className="font-semibold">Notes:</span> {order.notes}
              </p>
            )}
          </div>

          {/* ----- payment ----- */}
          <div className="bg-white rounded-sm border border-ink/10 p-6">
            <h2 className="font-bold text-ink mb-4">Payment</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-terracotta-dark">Method</span>
                <span className="text-ink">
                  {PAYMENT_METHOD_LABELS[order.paymentMethod] || order.paymentMethod}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-terracotta-dark">Status</span>
                <PaymentStatusBadge status={order.paymentStatus} />
              </div>
              {order.paymentId && (
                <div className="flex justify-between">
                  <span className="text-terracotta-dark">Payment ID</span>
                  <span className="text-ink">{order.paymentId}</span>
                </div>
              )}
              {order.paymentStatus === 'pending' && (
                <p className="text-xs text-ink-soft bg-cream rounded-sm p-3 mt-2">
                  Payment for this order has not been completed yet.
                </p>
              )}
            </div>
          </div>
        </div>

        {order.orderStatus === 'delivered' && (
          <div className="bg-white rounded-sm border border-ink/10 p-6 mt-6">
            <h2 className="font-bold text-ink mb-2">Authenticity Certificates</h2>
            <p className="text-sm text-ink-soft mb-4">
              Generate verifiable QR certificates for the handcrafted items in this delivered order.
            </p>
            <div className="divide-y divide-ink/10">
              {(order.items || []).map((item, index) => {
                const productId = item.product?._id || item.product;
                const cert = certificates.find(
                  (c) => String(c.product?._id || c.product) === String(productId)
                );
                return (
                  <div
                    key={productId || index}
                    className="py-4 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3">
                      {cert?.qrCode && (
                        <img
                          src={cert.qrCode}
                          alt={`QR for ${cert.certificateNumber}`}
                          className="w-14 h-14 border border-ink/10 rounded-sm bg-white p-0.5 shrink-0"
                        />
                      )}
                      <div>
                        <p className="font-medium text-ink">
                          {item.product?.name || 'Handcrafted Item'}
                        </p>
                        {cert ? (
                          <p className="text-xs text-green-700 font-mono mt-0.5">
                            Issued: {cert.certificateNumber}
                          </p>
                        ) : (
                          <p className="text-xs text-ink-soft mt-0.5">
                            No certificate generated yet
                          </p>
                        )}
                      </div>
                    </div>

                    {cert ? (
                      <Link
                        to={`/verify/${encodeURIComponent(cert.certificateNumber)}`}
                        className="px-4 py-2 bg-parchment text-ink rounded-sm text-sm font-medium hover:bg-linen transition text-center"
                      >
                        View &amp; Print Certificate →
                      </Link>
                    ) : productId ? (
                      <button
                        type="button"
                        onClick={() => handleGenerateCertificate(productId)}
                        disabled={generatingFor === productId}
                        className="px-4 py-2 bg-terracotta text-white rounded-sm text-sm font-semibold hover:bg-terracotta-dark transition disabled:opacity-50"
                      >
                        {generatingFor === productId ? 'Generating…' : 'Generate Certificate'}
                      </button>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <Link
          to="/orders"
          className="inline-block mt-6 text-terracotta-dark hover:text-ink font-medium text-sm"
        >
          ← Back to My Orders
        </Link>
      </div>
    </div>
  );
}

export default OrderDetail;
