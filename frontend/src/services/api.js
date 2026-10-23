/**
 * Frontend API client communicating with Flask backend.
 * Uses relative URL /api to leverage Vite proxy in dev and same-origin in production.
 */

const BASE_URL = '/api';

async function handleResponse(response) {
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const errorMsg = data?.error || data?.message || `HTTP error ${response.status}: ${response.statusText}`;
    const err = new Error(errorMsg);
    err.details = data?.details;
    err.status = response.status;
    throw err;
  }
  return data?.data !== undefined ? data.data : data;
}

export const api = {
  async getHealth() {
    const res = await fetch(`${BASE_URL}/health`);
    return handleResponse(res);
  },

  async getModels() {
    const res = await fetch(`${BASE_URL}/models`);
    return handleResponse(res);
  },

  async getLanguages() {
    const res = await fetch(`${BASE_URL}/languages`);
    return handleResponse(res);
  },

  async translate({ text, target_lang, source_lang = 'auto' }) {
    const res = await fetch(`${BASE_URL}/translate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, target_lang, source_lang }),
    });
    return handleResponse(res);
  },

  async rewrite(payload) {
    const res = await fetch(`${BASE_URL}/rewrite`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return handleResponse(res);
  },

  async analyze(text) {
    const res = await fetch(`${BASE_URL}/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
    return handleResponse(res);
  },

  async getHistory(limit = 30) {
    const res = await fetch(`${BASE_URL}/history?limit=${limit}`);
    return handleResponse(res);
  },

  async getHistoryItem(id) {
    const res = await fetch(`${BASE_URL}/history/${id}`);
    return handleResponse(res);
  },

  async deleteHistoryItem(id) {
    const res = await fetch(`${BASE_URL}/history/${id}`, {
      method: 'DELETE',
    });
    return handleResponse(res);
  },

  async clearAllHistory() {
    const res = await fetch(`${BASE_URL}/history?confirm=true`, {
      method: 'DELETE',
    });
    return handleResponse(res);
  },

  async parseVcf(vcfContent) {
    const res = await fetch(`${BASE_URL}/contacts/parse-vcf`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ vcf_content: vcfContent }),
    });
    return handleResponse(res);
  },

  async testSmtp(smtpConfig) {
    const res = await fetch(`${BASE_URL}/email/test-smtp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ smtp_config: smtpConfig }),
    });
    return handleResponse(res);
  },

  async sendEmail({ to_email, subject, body, smtp_config }) {
    const res = await fetch(`${BASE_URL}/email/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to_email, subject, body, smtp_config }),
    });
    return handleResponse(res);
  }
};
