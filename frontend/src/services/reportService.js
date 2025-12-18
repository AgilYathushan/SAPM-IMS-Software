import api from './api';

export const reportService = {
  create: (data) => api.post('/v1/diagnostic-reports', data),
  getAll: () => api.get('/v1/diagnostic-reports'),
  getById: (id) => api.get(`/v1/diagnostic-reports/${id}`),
  getByPatient: (patientId) => api.get(`/v1/diagnostic-reports/patient/${patientId}`),
  getByImage: (imageId) => api.get(`/v1/diagnostic-reports/image/${imageId}`),
  update: (id, data) => api.put(`/v1/diagnostic-reports/${id}`, data),
  finalize: (id) => api.post(`/v1/diagnostic-reports/${id}/finalize`),
  delete: (id) => api.delete(`/v1/diagnostic-reports/${id}`),
};

