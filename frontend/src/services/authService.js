import api, { multipart } from './api';

export const authService = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  getProfile: () => api.get('/auth/me'),
  updateProfile: (data) => api.put('/auth/profile', data),
  changePassword: (data) => api.put('/auth/password', data),

  // Profile picture for any signed-in user (customer, artisan or admin).
  uploadAvatar: (file) => {
    const fd = new FormData();
    fd.append('avatar', file);
    return api.post('/auth/avatar', fd, multipart);
  },
};

export default authService;
