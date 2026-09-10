const BASE_URL = '/api/v1';

async function handleResponse(response) {
  if (!response.ok) {
    if (response.status === 401) {
      localStorage.removeItem('access_token');
      localStorage.removeItem('tenderx_tokens');
    }
    let errorMsg = 'API Request failed';
    try {
      const errorData = await response.json();
      if (typeof errorData === 'object' && errorData !== null) {
        errorMsg = errorData.error || errorData.detail || errorData.message || Object.entries(errorData).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`).join('; ');
      } else {
        errorMsg = String(errorData);
      }
    } catch (e) {
      errorMsg = `HTTP Error ${response.status}: ${response.statusText}`;
    }
    throw new Error(errorMsg);
  }
  return response.json();
}

function getAuthHeaders(isJson = true) {
  let token = localStorage.getItem('access_token');
  if (!token) {
    const tenderxTokens = localStorage.getItem('tenderx_tokens');
    if (tenderxTokens) {
      try {
        const parsed = JSON.parse(tenderxTokens);
        token = parsed.access || parsed.token;
      } catch (e) {}
    }
  }
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
    return handleResponse(res);
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
    return handleResponse(res);
  },

  // Document Detail
  async getDocumentDetail(id) {
    const res = await fetch(`${BASE_URL}/documents/${id}/`, {
      headers: getAuthHeaders(true),
    });
    return handleResponse(res);
  },

  // Secure Document Viewer Data
  async getViewerData(id) {
    const res = await fetch(`${BASE_URL}/documents/${id}/viewer/`, {
      headers: getAuthHeaders(true),
    });
    return handleResponse(res);
  },

  // Presigned Download URL
  async getDownloadUrl(id) {
    const res = await fetch(`${BASE_URL}/documents/${id}/download/`, {
      headers: getAuthHeaders(true),
    });
    return handleResponse(res);
  },

  // Single / Presigned Upload Workflow
  async initiateUpload(data) {
    const res = await fetch(`${BASE_URL}/documents/upload/initiate/`, {
      method: 'POST',
      headers: getAuthHeaders(true),
      body: JSON.stringify(data),
    });
    return handleResponse(res);
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
    return handleResponse(res);
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
    return handleResponse(res);
  },

  // Version History
  async getVersions(id) {
    const res = await fetch(`${BASE_URL}/documents/${id}/versions/`, {
      headers: getAuthHeaders(true),
    });
    return handleResponse(res);
  },

  // Verification
  async verifyDocument(id, status, reason = '') {
    const res = await fetch(`${BASE_URL}/documents/${id}/verify/`, {
      method: 'POST',
      headers: getAuthHeaders(true),
      body: JSON.stringify({ status, reason }),
    });
    return handleResponse(res);
  },

  // Archive / Restore
  async archiveDocument(id) {
    const res = await fetch(`${BASE_URL}/documents/${id}/archive/`, {
      method: 'POST',
      headers: getAuthHeaders(true),
    });
    return handleResponse(res);
  },

  async restoreDocument(id) {
    const res = await fetch(`${BASE_URL}/documents/${id}/restore/`, {
      method: 'POST',
      headers: getAuthHeaders(true),
    });
    return handleResponse(res);
  },

  // Delete
  async deleteDocument(id) {
    const res = await fetch(`${BASE_URL}/documents/${id}/`, {
      method: 'DELETE',
      headers: getAuthHeaders(true),
    });
    return handleResponse(res);
  },

  // Expiring Documents
  async getExpiringDocuments(days = 30) {
    const res = await fetch(`${BASE_URL}/documents/expiring/?days=${days}`, {
      headers: getAuthHeaders(true),
    });
    return handleResponse(res);
  },

  // Templates
  async getTemplates() {
    const res = await fetch(`${BASE_URL}/documents/templates/`, {
      headers: getAuthHeaders(true),
    });
    return handleResponse(res);
  },

  async createTemplate(data) {
    const res = await fetch(`${BASE_URL}/documents/templates/`, {
      method: 'POST',
      headers: getAuthHeaders(true),
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  async generateFromTemplate(id, data) {
    const res = await fetch(`${BASE_URL}/documents/templates/${id}/generate/`, {
      method: 'POST',
      headers: getAuthHeaders(true),
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  // Storage Health Check
  async checkStorageHealth() {
    const res = await fetch(`${BASE_URL}/documents/health/storage/`);
    return handleResponse(res);
  }
};
