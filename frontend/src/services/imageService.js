import api from './api';

export const imageService = {
  upload: async (patientId, imageType, file, description, medicalTestId = null) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('patient_id', patientId);
    formData.append('image_type', imageType);
    if (description) {
      formData.append('description', description);
    }
    if (medicalTestId) {
      formData.append('medical_test_id', medicalTestId.toString());
    }
    
    const response = await api.post(
      '/v1/medical-images/upload',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data;
  },

  getAll: () => api.get('/v1/medical-images'),
  getById: (id) => api.get(`/v1/medical-images/${id}`),
  getByPatient: (patientId) => api.get(`/v1/medical-images/patient/${patientId}`),
  updateStatus: (id, status) => api.patch(`/v1/medical-images/${id}/status?status=${status}`),
  delete: (id) => api.delete(`/v1/medical-images/${id}`),
};
