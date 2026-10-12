import api from './api';

export const reviewService = {
  getProductReviews: (productId) => api.get(`/reviews/product/${productId}`),
  getArtisanReviews: (artisanId) => api.get(`/reviews/artisan/${artisanId}`),
  canReview: (productId) => api.get(`/reviews/product/${productId}/can-review`),
  create: (data) => api.post('/reviews', data),
  markHelpful: (id) => api.put(`/reviews/${id}/helpful`),
};

export default reviewService;
