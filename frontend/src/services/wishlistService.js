import api from './api';

// Wishlist API (/api/wishlist)
export const wishlistService = {
  get: () => api.get('/wishlist'),
  add: (productId) => api.post(`/wishlist/${productId}`),
  remove: (productId) => api.delete(`/wishlist/${productId}`),
  moveToCart: (productId, quantity = 1) => api.post(`/wishlist/${productId}/move-to-cart`, { quantity }),
};

export default wishlistService;
