import { apiRequest } from './apiClient.js';

export const adminAuthApi = {
  async login(email, password) {
    return apiRequest('/api/admin/auth/login', { method: 'POST', body: { email, password } });
  },
  async me(token) {
    return apiRequest('/api/admin/auth/me', { token });
  },
};
