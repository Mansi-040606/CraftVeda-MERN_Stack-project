import api from './api';

export const productService = {
  getAll: (params) => api.get('/products', { params }),
  getById: (id) => api.get(`/products/${id}`),
  create: (data) => api.post('/products', data),
  update: (id, data) => api.put(`/products/${id}`, data),
  delete: (id) => api.delete(`/products/${id}`),
  // The artisan's own products (includes inactive ones).
  getMine: (params) => api.get('/products/mine', { params }),
  // Partial update: quick stock edit and activate/deactivate.
  patch: (id, data) => api.patch(`/products/${id}`, data),
};

export default productService;
