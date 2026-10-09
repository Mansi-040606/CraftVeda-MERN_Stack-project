import api from './api';

export const donationService = {
  getAll: (params) => api.get('/donations', { params }),
  create: (data) => api.post('/donations', data),
};

export default donationService;
