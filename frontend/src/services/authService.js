import api from './api';

export const authService = {
  // ============================
  // LOGIN
  // ============================
  login: async (username, password) => {
    const response = await api.post('/v1/auth/login', {
      username,
      password
    });
    return response.data; // DO NOT store token here
  },

  // ============================
  // REGISTER - Moved to userService
  // ============================
  // Registration is now handled by userService.create()

  // ============================
  // CURRENT USER (OPTIONAL)
  // ============================
  getCurrentUser: async () => {
    try {
      const response = await api.get('/v1/auth/me');
      return response.data;
    } catch {
      // DO NOT logout or throw
      return null;
    }
  },

  // ============================
  // LOGOUT (PURE)
  // ============================
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    // Navigation handled by UI
  },

  // ============================
  // TOKEN HELPERS
  // ============================
  isAuthenticated: () => {
    return Boolean(localStorage.getItem('token'));
  },

  getToken: () => {
    return localStorage.getItem('token');
  },

  getUser: () => {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  },

  // ============================
  // PASSWORD RESET - Moved to userService
  // ============================
  // Password reset is now handled by userService.resetPassword()
};
