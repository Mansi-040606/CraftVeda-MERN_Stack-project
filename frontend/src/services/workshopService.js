import api from './api';

export const workshopService = {
  getAll: (params) => api.get('/workshops', { params }),
  getById: (id) => api.get(`/workshops/${id}`),
  book: (id, data) => api.post(`/workshops/${id}/book`, data),
  getMyBookings: () => api.get('/workshops/my-bookings'),
};

export default workshopService;
