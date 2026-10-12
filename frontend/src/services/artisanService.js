import api from './api';

export const artisanService = {
  getAll: (params) => api.get('/artisans', { params }),
  getById: (id) => api.get(`/artisans/${id}`),
  getProducts: (id) => api.get(`/artisans/${id}/products`),
  create: (data) => api.post('/artisans', data),
  update: (id, data) => api.put(`/artisans/${id}`, data),

  // Logged-in artisan: own dashboard data.
  myStats: () => api.get('/artisans/me/stats'),
  myOrders: (params) => api.get('/artisans/me/orders', { params }),
};

export default artisanService;
