import { apiRequest } from './apiClient.js';

export const adminExamsApi = {
  async list(token) {
    return apiRequest('/api/admin/exams', { token });
  },
  async get(token, examId) {
    return apiRequest(`/api/admin/exams/${examId}`, { token });
  },
  async create(token, payload) {
    return apiRequest('/api/admin/exams', { method: 'POST', token, body: payload });
  },
  async update(token, examId, payload) {
    return apiRequest(`/api/admin/exams/${examId}`, { method: 'PUT', token, body: payload });
  },
  async publish(token, examId) {
    return apiRequest(`/api/admin/exams/${examId}/publish`, { method: 'POST', token });
  },
  async unpublish(token, examId) {
    return apiRequest(`/api/admin/exams/${examId}/unpublish`, { method: 'POST', token });
  },
  async remove(token, examId) {
    return apiRequest(`/api/admin/exams/${examId}`, { method: 'DELETE', token });
  },
};
