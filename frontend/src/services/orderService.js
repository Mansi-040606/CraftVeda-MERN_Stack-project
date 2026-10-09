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

export default orderService;
