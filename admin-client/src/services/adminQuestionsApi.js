import { apiRequest } from './apiClient.js';

export const adminQuestionsApi = {
  async list(token, examId) {
    return apiRequest(`/api/admin/exams/${examId}/questions`, { token });
  },
  async create(token, examId, payload) {
    return apiRequest(`/api/admin/exams/${examId}/questions`, { method: 'POST', token, body: payload });
  },
  async update(token, examId, questionId, payload) {
    return apiRequest(`/api/admin/exams/${examId}/questions/${questionId}`, {
      method: 'PUT',
      token,
      body: payload,
    });
  },
  async remove(token, examId, questionId) {
    return apiRequest(`/api/admin/exams/${examId}/questions/${questionId}`, { method: 'DELETE', token });
  },
  async reorder(token, examId, orderedIds) {
    return apiRequest(`/api/admin/exams/${examId}/questions/reorder`, {
      method: 'PUT',
      token,
      body: { orderedIds },
    });
  },
  async bulk(token, examId, questions) {
    return apiRequest(`/api/admin/exams/${examId}/questions/bulk`, {
      method: 'POST',
      token,
      body: { questions },
    });
  },
  async settings(token, examId, payload) {
    return apiRequest(`/api/admin/exams/${examId}/question-settings`, {
      method: 'PUT',
      token,
      body: payload,
    });
  },
};
