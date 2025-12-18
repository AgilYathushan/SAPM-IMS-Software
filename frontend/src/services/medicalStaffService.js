import api from './api';

export const medicalStaffService = {
  getAll: (params = {}) => api.get('/v1/medical-staff', { params }),
  getById: (id) => api.get(`/v1/medical-staff/${id}`),
  getByUserId: (userId) => api.get(`/v1/medical-staff/by-user/${userId}`),
  create: (data) => api.post('/v1/medical-staff', data),
  update: (id, data) => api.put(`/v1/medical-staff/${id}`, data),
  delete: (id) => api.delete(`/v1/medical-staff/${id}`),
};
