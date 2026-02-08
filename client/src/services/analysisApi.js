import { apiRequest } from './apiClient.js';

export const analysisApi = {
  async me(token) {
    return apiRequest('/api/analysis/me', { token });
  },
};
