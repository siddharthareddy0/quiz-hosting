import { apiRequest } from './apiClient.js';

export const adminResultsApi = {
  async examResults(token, examId, { q = '', limit = 200 } = {}) {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (limit) params.set('limit', String(limit));
    const suffix = params.toString() ? `?${params.toString()}` : '';
    return apiRequest(`/api/admin/exams/${examId}/results${suffix}`, { token });
  },

  async recalculate(token, examId) {
    return apiRequest(`/api/admin/exams/${examId}/results/recalculate`, { method: 'POST', token });
  },

  async updateLeaderboard(token, examId, payload) {
    return apiRequest(`/api/admin/exams/${examId}/results/leaderboard`, { method: 'PUT', token, body: payload });
  },
};
