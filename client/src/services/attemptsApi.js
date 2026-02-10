import { apiRequest } from './apiClient.js';

function getDeviceFingerprint() {
  const key = 'qh_device_fingerprint';
  let fp = localStorage.getItem(key);
  if (!fp) {
    fp = `${Date.now()}_${Math.random().toString(16).slice(2)}`;
    localStorage.setItem(key, fp);
  }
  return fp;
}

export const attemptsApi = {
  async getOrCreate(token, testId) {
    return apiRequest(`/api/attempts/${testId}`, { token });
  },
  async sessionStatus(token, testId) {
    return apiRequest(`/api/exam/session-status?examId=${encodeURIComponent(testId)}`, {
      token,
      headers: { 'x-device-fingerprint': getDeviceFingerprint() },
    });
  },
  async start(token, testId) {
    return apiRequest(`/api/attempts/${testId}/start`, {
      method: 'POST',
      token,
      headers: { 'x-device-fingerprint': getDeviceFingerprint() },
    });
  },
  async saveProgress(token, testId, payload) {
    return apiRequest(`/api/attempts/${testId}/progress`, {
      method: 'PUT',
      token,
      body: payload,
      headers: { 'x-device-fingerprint': getDeviceFingerprint() },
    });
  },
  async submit(token, testId, payload) {
    return apiRequest(`/api/attempts/${testId}/submit`, {
      method: 'POST',
      token,
      body: payload,
      headers: { 'x-device-fingerprint': getDeviceFingerprint() },
    });
  },
  async review(token, testId) {
    return apiRequest(`/api/attempts/${testId}/review`, { token });
  },
  async leaderboard(token, testId) {
    return apiRequest(`/api/attempts/${testId}/leaderboard`, { token });
  },
};
