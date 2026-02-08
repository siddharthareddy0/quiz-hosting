import { apiRequest } from './apiClient.js';

export const adminMalpracticeApi = {
  async listCases(token, { examId = '', q = '', status = '', riskMin = 0, limit = 200 } = {}) {
    const params = new URLSearchParams();
    if (examId) params.set('examId', examId);
    if (q) params.set('q', q);
    if (status) params.set('status', status);
    if (riskMin) params.set('riskMin', String(riskMin));
    if (limit) params.set('limit', String(limit));
    const suffix = params.toString() ? `?${params.toString()}` : '';
    return apiRequest(`/api/admin/malpractice/cases${suffix}`, { token });
  },

  async setStatus(token, attemptId, { status, note } = {}) {
    return apiRequest(`/api/admin/malpractice/cases/${attemptId}/status`, {
      method: 'PUT',
      token,
      body: { status, note },
    });
  },
};
