import { apiRequest } from './apiClient.js';

export const adminAttendanceApi = {
  async rows(token, { examId, q = '', limit = 500 } = {}) {
    const params = new URLSearchParams();
    if (examId) params.set('examId', examId);
    if (q) params.set('q', q);
    if (limit) params.set('limit', String(limit));
    const suffix = params.toString() ? `?${params.toString()}` : '';
    return apiRequest(`/api/admin/attendance/rows${suffix}`, { token });
  },
};
