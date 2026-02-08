import { apiRequest } from './apiClient.js';

export const adminDashboardApi = {
  async stats(token) {
    return apiRequest('/api/admin/dashboard/stats', { token });
  },
};
