import api from './api';

export const workshopService = {
  // Public catalogue + detail.
  getAll: (params) => api.get('/workshops', { params }),
  getById: (id) => api.get(`/workshops/${id}`),

  // Booking (customer side).
  book: (id, data) => api.post(`/workshops/${id}/book`, data),
  getMyBookings: () => api.get('/workshops/my-bookings'),
  cancelBooking: (bookingId) => api.delete(`/workshops/bookings/${bookingId}`),

  // Artisan management of own workshops.
  getMine: () => api.get('/workshops/mine'),
  create: (data) => api.post('/workshops/mine', data),
  update: (id, data) => api.put(`/workshops/mine/${id}`, data),
  remove: (id) => api.delete(`/workshops/mine/${id}`),
  getMineBookings: (id) => api.get(`/workshops/mine/${id}/bookings`),
};

export default workshopService;
