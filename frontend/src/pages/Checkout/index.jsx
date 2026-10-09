import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { orderService, loadRazorpay } from '../../services/orderService';
import { toast, errMsg } from '../../components/Toast';
import { inr } from '../../utils/format';

// Exactly what the backend accepts: cod, card, upi, netbanking, wallet.
// Everything except cod is paid through the Razorpay checkout.
const PAYMENT_OPTIONS = [
  { value: 'cod', label: 'Cash on Delivery', hint: 'Pay when your order arrives', online: false },
  { value: 'card', label: 'Card', hint: 'Visa, Mastercard, RuPay', online: true },
  { value: 'upi', label: 'UPI', hint: 'Google Pay, PhonePe, Paytm', online: true },
  { value: 'netbanking', label: 'Net Banking', hint: 'All major banks', online: true },
  { value: 'wallet', label: 'Wallet', hint: 'Popular wallets', online: true },
];

// Turns backend errors into something a shopper can act on.
const friendlyError = (err, fallback) => {
  const raw = errMsg(err, fallback);
  if (/razorpay is not configured/i.test(raw)) {
    return 'Online payments are not set up on this server yet. Please choose Cash on Delivery or try again later.';
  }
  return raw;
};

function Checkout() {
  const { user } = useAuth();
  const { cart, loading, loadError, reload, clearCart } = useCart();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    street: '',
    city: '',
    state: '',
    pincode: '',
    country: 'India',
  });
  const [errors, setErrors] = useState({});
  const [paymentMethod, setPaymentMethod] = useState('cod');
  const [submitting, setSubmitting] = useState(false);
  const [orderId, setOrderId] = useState(null); // order created but not paid yet
  const [failure, setFailure] = useState(null);

  // Prefill from the saved profile address once it loads; never overwrite typed input.
  useEffect(() => {
    const address = user?.address;
    if (!address) return;
    setForm((prev) => ({
      street: prev.street || address.street || '',
      city: prev.city || address.city || '',
      state: prev.state || address.state || '',
      pincode: prev.pincode || address.pincode || '',
      country: address.country || prev.country || 'India',
    }));
  }, [user]);

  const items = cart.items || [];
  const availableItems = items.filter((item) => item.available && item.product);
  const subtotal = cart.subtotal || 0;
  // Mirrors the backend formula — display only; the server recomputes on order creation.
  const shipping = subtotal > 500 ? 0 : 50;
  const tax = Math.round(subtotal * 0.18);
  const estimatedTotal = subtotal + shipping + tax;
  const isOnline = paymentMethod !== 'cod';
  const locked = Boolean(orderId); // unpaid order already exists → only retry payment

  const setField = (name, value) => {
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const validate = () => {
    const next = {};
    if (!form.street.trim()) next.street = 'Street address is required';
    if (!form.city.trim()) next.city = 'City is required';
    if (!form.state.trim()) next.state = 'State is required';
    if (!form.pincode.trim()) next.pincode = 'PIN code is required';
    else if (!/^\d{6}$/.test(form.pincode.trim())) next.pincode = 'PIN code must be 6 digits';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  // Creates the Razorpay order on the backend, opens the checkout and verifies the signature.
  const payWithRazorpay = async (id) => {
    const payRes = await orderService.createPayment({
      referenceType: 'order',
      referenceId: id,
    });
    const { key, razorpayOrderId, amount, currency } = payRes.data;

    const Razorpay = await loadRazorpay();

    await new Promise((resolve, reject) => {
      let settled = false;
      const fail = (message) => {
        if (settled) return;
        settled = true;
        reject(new Error(message));
      };

      const checkout = new Razorpay({
        key, // comes from the backend response — never hardcoded
        amount,
        currency,
        order_id: razorpayOrderId,
        name: 'CraftVeda',
        description: `Order #${String(id).slice(-6).toUpperCase()}`,
        prefill: {
          name: user?.name || '',
          email: user?.email || '',
          contact: user?.phone || '',
        },
        theme: { color: '#b45309' },
        handler: async (response) => {
          if (settled) return;
          settled = true;
          try {
            await orderService.verifyPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
            resolve();
          } catch (err) {
            reject(
              new Error(
                errMsg(err, 'Payment could not be verified. Please contact support if you were charged.')
              )
            );
          }
        },
        modal: {
          ondismiss: () => fail('Payment was cancelled. Your order is saved — you can retry below.'),
        },
      });

      checkout.on('payment.failed', (resp) =>
        fail(resp.error?.description || 'Payment failed. Please try again.')
      );
      checkout.open();
    });
  };

  const handlePlaceOrder = async () => {
    if (submitting) return;
    if (!validate()) return;
    if (availableItems.length === 0) return;

    setSubmitting(true);
    setFailure(null);
    let createdId = orderId;

    try {
      if (!createdId) {
        const res = await orderService.create({
          // Only ids and quantities — the server prices and checks stock.
          items: availableItems.map((item) => ({
            product: item.product._id,
            quantity: item.quantity,
          })),
          shippingAddress: {
            street: form.street.trim(),
            city: form.city.trim(),
            state: form.state.trim(),
            pincode: form.pincode.trim(),
            country: form.country.trim() || 'India',
          },
          paymentMethod,
        });
        createdId = res.data.order._id;
        setOrderId(createdId);
      }

      if (isOnline) {
        await payWithRazorpay(createdId);
      }

      // Success: empty the server cart, refresh the cart context and show the order.
      await clearCart();
      reload();
      toast.success(isOnline ? 'Payment successful — order confirmed' : 'Order placed successfully');
      navigate(`/order/${createdId}`, { replace: true });
    } catch (err) {
      const message = friendlyError(err, 'Could not place your order');
      setFailure(message);
      toast.error(message);
      // The order was never created (stock changed / item unavailable) → refresh the cart.
      if (!createdId) reload();
    } finally {
      setSubmitting(false);
    }
  };

  const renderField = (name, label, placeholder) => (
    <div>
      <label htmlFor={name} className="text-sm text-amber-800 font-medium">
        {label}
      </label>
      <input
        id={name}
        type="text"
        value={form[name]}
        onChange={(e) => setField(name, e.target.value)}
        placeholder={placeholder}
        disabled={locked || submitting}
        className={`w-full border rounded-lg px-4 py-2 mt-1 disabled:bg-amber-50 ${
          errors[name] ? 'border-red-400' : 'border-amber-300'
        }`}
      />
      {errors[name] && <p className="text-red-600 text-xs mt-1">{errors[name]}</p>}
    </div>
  );

  // ----- states before the form -----
  if (loading) {
    return (
      <div className="min-h-screen bg-amber-50 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <h1 className="text-2xl font-bold text-amber-900 mb-8">Checkout</h1>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white rounded-xl shadow-md p-6 h-64 animate-pulse" />
              <div className="bg-white rounded-xl shadow-md p-6 h-48 animate-pulse" />
            </div>
            <div className="bg-white rounded-xl shadow-md p-6 h-64 animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  const blocked = (title, message, to, linkLabel) => (
    <div className="min-h-screen bg-amber-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        <h1 className="text-2xl font-bold text-amber-900 mb-8">Checkout</h1>
        <div className="bg-white rounded-xl shadow-md p-12 text-center">
          <span className="text-6xl">🛒</span>
          <h2 className="text-xl font-semibold text-amber-900 mt-4">{title}</h2>
          <p className="text-amber-600 mt-2">{message}</p>
          <Link
            to={to}
            className="inline-block mt-4 bg-amber-700 text-white px-6 py-2 rounded-lg hover:bg-amber-800 transition"
          >
            {linkLabel}
          </Link>
        </div>
      </div>
    </div>
  );

  if (loadError) {
    return blocked('Could not load your cart', `${loadError}. Go back and try again.`, '/cart', 'Back to Cart');
  }
  if (items.length === 0) {
    return blocked('Your cart is empty', 'Add some products before checking out.', '/products', 'Browse Products');
  }
  if (availableItems.length === 0) {
    return blocked(
      'Nothing available to order',
      'None of the items in your cart can be ordered right now. Update your cart and try again.',
      '/cart',
      'Back to Cart'
    );
  }

  return (
    <div className="min-h-screen bg-amber-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-2xl font-bold text-amber-900 mb-8">Checkout</h1>

        {failure && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
            <p className="font-semibold text-red-700">
              {isOnline ? 'Payment problem' : 'Order problem'}
            </p>
            <p className="text-sm text-red-700 mt-1">{failure}</p>
            {orderId && (
              <Link
                to={`/order/${orderId}`}
                className="inline-block mt-2 text-sm font-medium text-red-800 underline"
              >
                View order (payment pending)
              </Link>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-xl shadow-md p-6">
              <h2 className="font-bold text-amber-900 mb-4">Shipping Address</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  {renderField('street', 'Street Address', 'House No., Street, Area')}
                </div>
                {renderField('city', 'City', 'City')}
                {renderField('state', 'State', 'State')}
                {renderField('pincode', 'PIN Code', '6-digit PIN')}
                {renderField('country', 'Country', 'Country')}
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-md p-6">
              <h2 className="font-bold text-amber-900 mb-4">Payment Method</h2>
              {locked && (
                <p className="text-sm bg-amber-50 border border-amber-200 text-amber-800 rounded-lg p-3 mb-4">
                  Order #{String(orderId).slice(-6).toUpperCase()} was created and is waiting for
                  payment. Retry below — you will not be charged twice.
                </p>
              )}
              <div className="space-y-3">
                {PAYMENT_OPTIONS.map((option) => (
                  <label
                    key={option.value}
                    className={`flex items-center gap-3 p-3 border rounded-lg transition ${
                      paymentMethod === option.value
                        ? 'border-amber-600 bg-amber-50'
                        : 'border-amber-200 hover:bg-amber-50'
                    } ${locked || submitting ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    <input
                      type="radio"
                      name="payment"
                      value={option.value}
                      checked={paymentMethod === option.value}
                      disabled={locked || submitting}
                      onChange={() => setPaymentMethod(option.value)}
                      className="text-amber-600"
                    />
                    <span className="flex-1">
                      <span className="block text-amber-800 font-medium">{option.label}</span>
                      <span className="block text-xs text-amber-600">{option.hint}</span>
                    </span>
                    {option.online && (
                      <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded">
                        Razorpay
                      </span>
                    )}
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div>
            <div className="bg-white rounded-xl shadow-md p-6 sticky top-24">
              <h2 className="font-bold text-amber-900 mb-4">Order Summary</h2>
              <div className="space-y-2 text-sm mb-4">
                {availableItems.map((item) => (
                  <div key={item.product._id} className="flex justify-between gap-2">
                    <span className="text-amber-700 truncate">
                      {item.product.name} × {item.quantity}
                    </span>
                    <span className="text-amber-900 flex-shrink-0">{inr(item.lineTotal)}</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-amber-200 pt-3 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-amber-700">Subtotal</span>
                  <span className="text-amber-900">{inr(subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-amber-700">Shipping (est.)</span>
                  <span className="text-amber-900">{shipping === 0 ? 'FREE' : inr(shipping)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-amber-700">Tax (est. 18% GST)</span>
                  <span className="text-amber-900">{inr(tax)}</span>
                </div>
                <div className="border-t border-amber-200 pt-2 flex justify-between font-bold">
                  <span className="text-amber-900">Total (est.)</span>
                  <span className="text-amber-900">{inr(estimatedTotal)}</span>
                </div>
              </div>
              <p className="text-xs text-amber-600 mt-2">
                Final pricing (shipping, GST, total) is calculated by the server when the order is
                placed.
              </p>

              <button
                onClick={handlePlaceOrder}
                disabled={submitting}
                className="w-full bg-amber-700 text-white py-3 rounded-lg mt-6 hover:bg-amber-800 transition font-semibold disabled:bg-amber-300 disabled:cursor-not-allowed"
              >
                {submitting
                  ? isOnline
                    ? 'Opening payment…'
                    : 'Placing order…'
                  : locked
                    ? 'Retry Payment'
                    : 'Place Order'}
              </button>

              <Link
                to="/cart"
                className="block w-full text-amber-700 text-center py-2 mt-3 hover:underline text-sm"
              >
                ← Back to Cart
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Checkout;
