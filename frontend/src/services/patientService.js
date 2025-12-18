import api from './api';

export const patientService = {
  getAll: () => api.get('/v1/patients'),
  getById: (id) => api.get(`/v1/patients/${id}`),
  getByUserId: (userId) => api.get(`/v1/patients/by-user/${userId}`),
  create: (data) => api.post('/v1/patients', data),
  update: (id, data) => api.put(`/v1/patients/${id}`, data),
  delete: (id) => api.delete(`/v1/patients/${id}`),
};

