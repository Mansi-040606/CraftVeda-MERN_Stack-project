import api from './api';

const adminApi = {
  stats: () => api.get('/admin/stats'),

  users: (params) => api.get('/admin/users', { params }),
  updateUser: (id, data) => api.put(`/admin/users/${id}`, data),
  deleteUser: (id) => api.delete(`/admin/users/${id}`),

  orders: (params) => api.get('/admin/orders', { params }),
  updateOrderStatus: (id, orderStatus) => api.put(`/admin/orders/${id}/status`, { orderStatus }),

  products: (params) => api.get('/products/admin', { params }),
  createProduct: (data) => api.post('/products', data),
  updateProduct: (id, data) => api.put(`/products/${id}`, data),
  patchProduct: (id, data) => api.patch(`/products/${id}`, data),
  deleteProduct: (id) => api.delete(`/products/${id}`),

  applications: (params) => api.get('/artisan-applications', { params }),
  approveApplication: (id, adminNotes) => api.put(`/artisan-applications/${id}/approve`, { adminNotes }),
  rejectApplication: (id, adminNotes) => api.put(`/artisan-applications/${id}/reject`, { adminNotes }),

  workshops: (params) => api.get('/workshops/admin', { params }),
  patchWorkshop: (id, data) => api.patch(`/workshops/${id}`, data),

  donations: (params) => api.get('/donations/all', { params }),

  giTags: (params) => api.get('/gi-tags/admin', { params }),
  patchGITag: (id, data) => api.patch(`/gi-tags/${id}`, data),

  reviews: (params) => api.get('/reviews', { params }),
  patchReview: (id, data) => api.patch(`/reviews/${id}`, data),

  artisans: (params) => api.get('/artisans', { params }),
};

export default adminApi;
