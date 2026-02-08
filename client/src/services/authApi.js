import { apiRequest } from './apiClient.js';

export const authApi = {
  async login(email, password) {
    return apiRequest('/api/auth/login', { method: 'POST', body: { email, password } });
  },
  async register({ name, email, password }) {
    return apiRequest('/api/auth/register', {
      method: 'POST',
      body: { name, email, password },
    });
  },
  async me(token) {
    return apiRequest('/api/auth/me', { token });
  },
};
