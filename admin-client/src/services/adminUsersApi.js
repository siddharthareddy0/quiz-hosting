import { apiRequest } from './apiClient.js';

export const adminUsersApi = {
  async list(token, { q = '', limit = 50 } = {}) {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (limit) params.set('limit', String(limit));
    const suffix = params.toString() ? `?${params.toString()}` : '';
    return apiRequest(`/api/admin/users${suffix}`, { token });
  },
};
