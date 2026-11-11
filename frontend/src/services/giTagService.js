import api from './api';

export const giTagService = {
  getAll: (params) => api.get('/gi-tags', { params }),
  getById: (id) => api.get(`/gi-tags/${id}`),
};

export default giTagService;
