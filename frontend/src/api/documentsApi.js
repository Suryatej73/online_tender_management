// API service layer for Module 8: Document Management & Document Intelligence

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

function getAuthHeaders(isJson = true) {
  const token = localStorage.getItem('access_token');
  const headers = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  if (isJson) {
    headers['Content-Type'] = 'application/json';
  }
  return headers;
}

export const documentsApi = {
  // Document Types
  async getDocumentTypes() {
    const res = await fetch(`${BASE_URL}/documents/types/`, {
      headers: getAuthHeaders(true),
    });
    return res.json();
  },

  // Document List with filtering & search
  async getDocuments(params = {}) {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') {
        query.append(k, v);
      }
    });
    const res = await fetch(`${BASE_URL}/documents/?${query.toString()}`, {
      headers: getAuthHeaders(true),
    });
    return res.json();
  },

  // Document Detail
  async getDocumentDetail(id) {
    const res = await fetch(`${BASE_URL}/documents/${id}/`, {
      headers: getAuthHeaders(true),
    });
    return res.json();
  },

  // Secure Document Viewer Data
  async getViewerData(id) {
    const res = await fetch(`${BASE_URL}/documents/${id}/viewer/`, {
      headers: getAuthHeaders(true),
    });
    return res.json();
  },

  // Presigned Download URL
  async getDownloadUrl(id) {
    const res = await fetch(`${BASE_URL}/documents/${id}/download/`, {
      headers: getAuthHeaders(true),
    });
    return res.json();
  },

  // Single / Presigned Upload Workflow
  async initiateUpload(data) {
    const res = await fetch(`${BASE_URL}/documents/upload/initiate/`, {
      method: 'POST',
      headers: getAuthHeaders(true),
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async completeUpload(payload) {
    let headers = {};
    let body;
    const token = localStorage.getItem('access_token');

    if (payload instanceof FormData) {
      if (token) headers['Authorization'] = `Bearer ${token}`;
      body = payload;
    } else {
      headers = getAuthHeaders(true);
      body = JSON.stringify(payload);
    }

    const res = await fetch(`${BASE_URL}/documents/upload/complete/`, {
      method: 'POST',
      headers,
      body,
    });
    return res.json();
  },

  // Upload New Version
  async uploadNewVersion(id, formData) {
    const token = localStorage.getItem('access_token');
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${BASE_URL}/documents/${id}/versions/`, {
      method: 'POST',
      headers,
      body: formData,
    });
    return res.json();
  },

  // Version History
  async getVersions(id) {
    const res = await fetch(`${BASE_URL}/documents/${id}/versions/`, {
      headers: getAuthHeaders(true),
    });
    return res.json();
  },

  // Verification
  async verifyDocument(id, status, reason = '') {
    const res = await fetch(`${BASE_URL}/documents/${id}/verify/`, {
      method: 'POST',
      headers: getAuthHeaders(true),
      body: JSON.stringify({ status, reason }),
    });
    return res.json();
  },

  // Archive / Restore
  async archiveDocument(id) {
    const res = await fetch(`${BASE_URL}/documents/${id}/archive/`, {
      method: 'POST',
      headers: getAuthHeaders(true),
    });
    return res.json();
  },

  async restoreDocument(id) {
    const res = await fetch(`${BASE_URL}/documents/${id}/restore/`, {
      method: 'POST',
      headers: getAuthHeaders(true),
    });
    return res.json();
  },

  // Delete
  async deleteDocument(id) {
    const res = await fetch(`${BASE_URL}/documents/${id}/`, {
      method: 'DELETE',
      headers: getAuthHeaders(true),
    });
    return res.json();
  },

  // Expiring Documents
  async getExpiringDocuments(days = 30) {
    const res = await fetch(`${BASE_URL}/documents/expiring/?days=${days}`, {
      headers: getAuthHeaders(true),
    });
    return res.json();
  },

  // Templates
  async getTemplates() {
    const res = await fetch(`${BASE_URL}/documents/templates/`, {
      headers: getAuthHeaders(true),
    });
    return res.json();
  },

  async createTemplate(data) {
    const res = await fetch(`${BASE_URL}/documents/templates/`, {
      method: 'POST',
      headers: getAuthHeaders(true),
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async generateFromTemplate(id, data) {
    const res = await fetch(`${BASE_URL}/documents/templates/${id}/generate/`, {
      method: 'POST',
      headers: getAuthHeaders(true),
      body: JSON.stringify(data),
    });
    return res.json();
  },

  // Storage Health Check
  async checkStorageHealth() {
    const res = await fetch(`${BASE_URL}/documents/health/storage/`);
    return res.json();
  }
};
