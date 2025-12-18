import api from './api';

export const userService = {
  // User CRUD operations
  getAll: () => api.get('/v1/users'),
  getById: (id) => api.get(`/v1/users/${id}`),
  update: (id, data) => api.put(`/v1/users/${id}`, data),
  create: (data) => api.post('/v1/users', data),
  delete: (id) => api.delete(`/v1/users/${id}`),
  // Password reset
  resetPassword: (resetData) => api.post('/v1/users/reset-password', resetData),
};
