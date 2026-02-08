import { apiRequest } from './apiClient.js';

export const testsApi = {
  async list(token) {
    return apiRequest('/api/tests', { token });
  },
  async get(token, testId) {
    return apiRequest(`/api/tests/${testId}`, { token });
  },
  async getExam(token, testId) {
    return apiRequest(`/api/tests/${testId}/exam`, { token });
  },
};
