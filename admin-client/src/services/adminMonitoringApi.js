import { apiRequest } from './apiClient.js';

export const adminMonitoringApi = {
  async live(token, { examId = '', q = '', riskMin = 0, limit = 200 } = {}) {
    const params = new URLSearchParams();
    if (examId) params.set('examId', examId);
    if (q) params.set('q', q);
    if (riskMin) params.set('riskMin', String(riskMin));
    if (limit) params.set('limit', String(limit));
    const suffix = params.toString() ? `?${params.toString()}` : '';
    return apiRequest(`/api/admin/monitoring/live${suffix}`, { token });
  },
};
