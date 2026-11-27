import api from './api';

const adminApi = {
  stats: () => api.get('/admin/stats'),
  statsTimeSeries: (months) => api.get('/admin/stats/timeseries', { params: { months } }),

  users: (params) => api.get('/admin/users', { params }),
  updateUser: (id, data) => api.put(`/admin/users/${id}`, data),
  deleteUser: (id) => api.delete(`/admin/users/${id}`),

  orders: (params) => api.get('/admin/orders', { params }),
  updateOrderStatus: (id, payload) =>
    api.put(`/admin/orders/${id}/status`, typeof payload === 'string' ? { orderStatus: payload } : payload),

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
  updateDonationStatus: (id, paymentStatus) => api.patch(`/donations/${id}`, { paymentStatus }),

  giTags: (params) => api.get('/gi-tags/admin', { params }),
  createGITag: (data) => api.post('/gi-tags', data),
  updateGITag: (id, data) => api.put(`/gi-tags/${id}`, data),
  patchGITag: (id, data) => api.patch(`/gi-tags/${id}`, data),

  stories: (params) => api.get('/craft-stories', { params }),
  createStory: (data) => api.post('/craft-stories', data),
  updateStory: (id, data) => api.put(`/craft-stories/${id}`, data),
  deleteStory: (id) => api.delete(`/craft-stories/${id}`),

  reviews: (params) => api.get('/reviews', { params }),
  patchReview: (id, data) => api.patch(`/reviews/${id}`, data),

  artisans: (params) => api.get('/artisans', { params }),
};

export default adminApi;
