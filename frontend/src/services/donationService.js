import api from './api';

export const donationService = {
  getAll: (params) => api.get('/donations', { params }),
  getMine: () => api.get('/donations/mine'),
  create: (data) => api.post('/donations', data),
};

export default donationService;
