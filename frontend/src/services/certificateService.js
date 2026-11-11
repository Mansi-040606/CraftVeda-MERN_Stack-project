import api from './api';

export const certificateService = {
  // Public: valid/invalid verdict.
  verify: (certificateNumber) => api.get(`/certificates/verify/${encodeURIComponent(certificateNumber)}`),
  // Public: full certificate with product + artisan details.
  get: (certificateNumber) => api.get(`/certificates/${encodeURIComponent(certificateNumber)}`),
};

export default certificateService;
