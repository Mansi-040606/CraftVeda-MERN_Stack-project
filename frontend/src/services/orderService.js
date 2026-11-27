import api from './api';

export const orderService = {
  getAll: (params) => api.get('/orders', { params }),
  getById: (id) => api.get(`/orders/${id}`),
  create: (data) => api.post('/orders', data),
  cancel: (id) => api.put(`/orders/${id}/cancel`),
  // Payment flow: create a Razorpay order for an existing CraftVeda order, then verify it.
  createPayment: (data) => api.post('/payments/create-order', data),
  verifyPayment: (data) => api.post('/payments/verify', data),
};

const RAZORPAY_SCRIPT = 'https://checkout.razorpay.com/v1/checkout.js';

// Loads the Razorpay checkout script exactly once and resolves with the constructor.
// Rejects (never hangs) when the script is blocked or takes too long.
export const loadRazorpay = () =>
  new Promise((resolve, reject) => {
    if (window.Razorpay) {
      resolve(window.Razorpay);
      return;
    }

    let script = document.querySelector(`script[src="${RAZORPAY_SCRIPT}"]`);
    let timer;

    const settle = (error) => {
      clearTimeout(timer);
      if (error) {
        reject(error);
      } else if (window.Razorpay) {
        resolve(window.Razorpay);
      } else {
        reject(new Error('Payment gateway failed to initialise. Please try again.'));
      }
    };

    if (!script) {
      script = document.createElement('script');
      script.src = RAZORPAY_SCRIPT;
      script.async = true;
      document.body.appendChild(script);
    }

    script.addEventListener('load', () => settle());
    script.addEventListener('error', () =>
      settle(new Error('Could not load the payment gateway. Check your connection and try again.'))
    );
    timer = setTimeout(
      () => settle(new Error('Payment gateway took too long to load. Please try again.')),
      15000
    );
  });

// Shared Razorpay flow for orders, donations, and workshop bookings.
export const runRazorpayPayment = async ({ referenceType, referenceId, description, user }) => {
  const payRes = await orderService.createPayment({ referenceType, referenceId });
  const { key, razorpayOrderId, amount, currency } = payRes.data;
  const Razorpay = await loadRazorpay();

  return new Promise((resolve, reject) => {
    let settled = false;
    let failureMessage = null;

    const settleFailure = () => {
      if (settled) return;
      settled = true;
      reject(new Error(failureMessage || 'Payment was cancelled. You can retry anytime.'));
    };

    const checkout = new Razorpay({
      key,
      amount,
      currency,
      order_id: razorpayOrderId,
      name: 'CraftVeda',
      description: description || `CraftVeda ${referenceType}`,
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
          const verifyRes = await orderService.verifyPayment({
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
          });
          resolve(verifyRes.data);
        } catch (err) {
          reject(new Error(err?.response?.data?.message || err?.message || 'Payment verification failed.'));
        }
      },
      modal: { ondismiss: settleFailure },
    });

    checkout.on('payment.failed', (resp) => {
      failureMessage = resp.error?.description || 'Payment failed. Please try again.';
    });

    checkout.open();
  });
};

export default orderService;
