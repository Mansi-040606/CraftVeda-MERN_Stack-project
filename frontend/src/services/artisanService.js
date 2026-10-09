import api from './api';

export const artisanService = {
  getAll: (params) => api.get('/artisans', { params }),
  getById: (id) => api.get(`/artisans/${id}`),
  getProducts: (id) => api.get(`/artisans/${id}/products`),
  create: (data) => api.post('/artisans', data),
  update: (id, data) => api.put(`/artisans/${id}`, data),
};

export default artisanService;
