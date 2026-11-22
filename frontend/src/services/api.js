import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Only bounce to /auth when an EXISTING session died (a token was sent
    // and came back 401). Failed sign-in attempts carry no token — their
    // 401 must reach the page so it can show the error/toast instead of
    // reloading the browser.
    if (error.response?.status === 401 && localStorage.getItem('token')) {
      localStorage.removeItem('token');
      window.location.href = '/auth';
    }
    return Promise.reject(error);
  }
);

// Multipart uploads: the instance default is `Content-Type: application/json`,
// which would make axios JSON-encode a FormData body. `false` removes the
// header for this request only, so the browser can set the multipart boundary.
export const multipart = { headers: { 'Content-Type': false } };

export default api;
