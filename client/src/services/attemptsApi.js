import { apiRequest } from './apiClient.js';

export const attemptsApi = {
  async getOrCreate(token, testId) {
    return apiRequest(`/api/attempts/${testId}`, { token });
  },
  async start(token, testId) {
    return apiRequest(`/api/attempts/${testId}/start`, { method: 'POST', token });
  },
  async saveProgress(token, testId, payload) {
    return apiRequest(`/api/attempts/${testId}/progress`, { method: 'PUT', token, body: payload });
  },
  async submit(token, testId, payload) {
    return apiRequest(`/api/attempts/${testId}/submit`, { method: 'POST', token, body: payload });
  },
  async review(token, testId) {
    return apiRequest(`/api/attempts/${testId}/review`, { token });
  },
  async leaderboard(token, testId) {
    return apiRequest(`/api/attempts/${testId}/leaderboard`, { token });
  },
};
