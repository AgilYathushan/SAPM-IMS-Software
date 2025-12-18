import api from './api';

export const billingService = {
  createBill: (data) => api.post('/v1/billing/bills', data),
  getBills: () => api.get('/v1/billing/bills'),
  getBillById: (id) => api.get(`/v1/billing/bills/${id}`),
  getBillsByPatient: (patientId) => api.get(`/v1/billing/bills/patient/${patientId}`),
  updateBill: (id, data) => api.put(`/v1/billing/bills/${id}`, data),
  updateBillStatus: (id, status) => api.put(`/v1/billing/bills/${id}/status`, null, {
    params: { status }
  }),
  createPayment: (data) => api.post('/v1/billing/payments', data),
  getPaymentsByBill: (billId) => api.get(`/v1/billing/payments/bill/${billId}`),
  getFinancialSummary: (patientId) => api.get(`/v1/billing/summary/patient/${patientId}`),
  getDashboard: () => api.get('/v1/billing/dashboard'),
};

