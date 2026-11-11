import api from './api';

export const craftStoryService = {
  getAll: (params) => api.get('/craft-stories', { params }),
  getBySlug: (slug) => api.get(`/craft-stories/${slug}`),
};

export default craftStoryService;
