import api from './api';

export const certificateService = {
  // Public: valid/invalid verdict.
  verify: (certificateNumber) => api.get(`/certificates/verify/${encodeURIComponent(certificateNumber)}`),
  // Public: full certificate with product + artisan details.
  get: (certificateNumber) => api.get(`/certificates/${encodeURIComponent(certificateNumber)}`),
  // Logged-in buyer: generate certificate for a delivered order item.
  generate: (orderId, productId) => api.post('/certificates/generate', { orderId, productId }),
  // Logged-in buyer: list certificates for an order or all own certificates.
  getByOrder: (orderId) => api.get(`/certificates/order/${encodeURIComponent(orderId)}`),
  getMine: () => api.get('/certificates/mine'),
};

export default certificateService;
