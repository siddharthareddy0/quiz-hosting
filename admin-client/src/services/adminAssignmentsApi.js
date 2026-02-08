import { apiRequest } from './apiClient.js';

export const adminAssignmentsApi = {
  async get(token, examId) {
    return apiRequest(`/api/admin/exams/${examId}/assignments`, { token });
  },
  async update(token, examId, payload) {
    return apiRequest(`/api/admin/exams/${examId}/assignments`, { method: 'PUT', token, body: payload });
  },
};
