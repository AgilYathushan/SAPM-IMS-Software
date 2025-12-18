import api from './api';

export const medicalTestService = {
  getAll: () => api.get('/v1/medical-tests'),
  getById: (id) => api.get(`/v1/medical-tests/${id}`),
  getByPatient: (patientId) => api.get(`/v1/medical-tests/patient/${patientId}`),
  create: (data) => api.post('/v1/medical-tests', data),
  update: (id, data) => api.put(`/v1/medical-tests/${id}`, data),
  delete: (id) => api.delete(`/v1/medical-tests/${id}`),
};

