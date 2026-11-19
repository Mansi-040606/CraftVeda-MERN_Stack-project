import api, { multipart } from './api';

const uploadField = (url, field, file) => {
  const fd = new FormData();
  fd.append(field, file);
  return api.post(url, fd, multipart);
};

export const artisanService = {
  getAll: (params) => api.get('/artisans', { params }),
  getById: (id) => api.get(`/artisans/${id}`),
  getProducts: (id) => api.get(`/artisans/${id}/products`),
  create: (data) => api.post('/artisans', data),
  update: (id, data) => api.put(`/artisans/${id}`, data),

  // Logged-in artisan: own profile + dashboard data.
  getMy: () => api.get('/artisans/me'),
  myStats: () => api.get('/artisans/me/stats'),
  myOrders: (params) => api.get('/artisans/me/orders', { params }),

  // --- images (Cloudinary) ---
  uploadProfileImage: (file) => uploadField('/artisans/me/profile-image', 'image', file),
  uploadCoverImage: (file) => uploadField('/artisans/me/cover-image', 'image', file),
};

export default artisanService;
