import api, { multipart } from './api';

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

  // --- images (Cloudinary) ---
  // Append up to 6 files to an existing product.
  uploadImages: (id, files) => {
    const fd = new FormData();
    files.forEach((file) => fd.append('images', file));
    return api.post(`/products/${id}/images`, fd, multipart);
  },
  // Remove one image URL from the product (best-effort Cloudinary cleanup).
  deleteImage: (id, url) => api.delete(`/products/${id}/images`, { data: { url } }),
  // Reorder images; the first URL becomes the cover image.
  reorderImages: (id, images) => api.put(`/products/${id}/images/order`, { images }),
};

export default productService;
