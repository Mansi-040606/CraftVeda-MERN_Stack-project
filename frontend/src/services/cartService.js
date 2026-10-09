import api from './api';

// Cart API (/api/cart)
export const cartService = {
  get: () => api.get('/cart'),
  add: (productId, quantity) => api.post('/cart', { productId, quantity }),
  updateQuantity: (productId, quantity) => api.put(`/cart/${productId}`, { quantity }),
  remove: (productId) => api.delete(`/cart/${productId}`),
  clear: () => api.delete('/cart'),
};

export default cartService;
