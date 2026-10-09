import api from './api';

export const artisanApplicationService = {
  submitApplication: (data) => api.post('/artisan-applications', data),
  getMyApplication: () => api.get('/artisan-applications/my-application'),
  getAllApplications: () => api.get('/artisan-applications'),
  getApplicationById: (id) => api.get(`/artisan-applications/${id}`),
  approveApplication: (id, adminNotes) => api.put(`/artisan-applications/${id}/approve`, { adminNotes }),
  rejectApplication: (id, adminNotes) => api.put(`/artisan-applications/${id}/reject`, { adminNotes }),
};

export default artisanApplicationService;