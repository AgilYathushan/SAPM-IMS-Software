import axios from 'axios';

const API_URL =
  process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// ================================
// REQUEST INTERCEPTOR
// ================================
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

// ================================
// RESPONSE INTERCEPTOR
// ================================
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // DO NOT logout
    // DO NOT redirect
    // DO NOT guess intent
    return Promise.reject(error);
  }
);

export default api;
