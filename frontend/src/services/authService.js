import api, { multipart } from './api';

export const authService = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  // Google sign-in: backend verifies the ID token, response shape = login.
  loginWithGoogle: (credential) => api.post('/auth/google', { credential }),
  // Forgot password with email OTP (3-step flow).
  forgotPassword: (data) => api.post('/auth/forgot-password', data),
  verifyOtp: (data) => api.post('/auth/verify-otp', data),
  resetPassword: (data) => api.post('/auth/reset-password', data),
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
