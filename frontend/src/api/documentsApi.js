const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

export function getAuthToken() {
  let token = localStorage.getItem('access_token');
  if (token === 'null' || token === 'undefined' || token === '') {
    token = null;
  }
  if (!token) {
    const tenderxTokens = localStorage.getItem('tenderx_tokens');
    if (tenderxTokens) {
      try {
        const parsed = JSON.parse(tenderxTokens);
        token = parsed.access || parsed.token;
        if (token === 'null' || token === 'undefined') token = null;
      } catch (e) {}
    }
  }
  return token;
}

export async function tryRefreshToken() {
  const refreshToken = localStorage.getItem('refresh_token');
  if (!refreshToken) return null;
  try {
    const res = await fetch(`${API_BASE_URL}/auth/token/refresh/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh: refreshToken })
    });
    if (res.ok) {
      const data = await res.json();
      if (data.access) {
        localStorage.setItem('access_token', data.access);
        const tenderxTokens = localStorage.getItem('tenderx_tokens');
        if (tenderxTokens) {
          try {
            const parsed = JSON.parse(tenderxTokens);
            parsed.access = data.access;
            localStorage.setItem('tenderx_tokens', JSON.stringify(parsed));
          } catch (e) {}
        }
        return data.access;
      }
    }
  } catch (err) {}
  return null;
}

export async function ensureAuthToken() {
  let token = getAuthToken();
  if (!token) {
    token = await tryRefreshToken();
  }
  return token;
}

async function handleResponse(response) {
  if (!response.ok) {
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

async function fetchWithAuth(url, options = {}) {
  let token = await ensureAuthToken();
  const isFormData = options.body instanceof FormData;
  const headers = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...(options.headers || {})
  };

  let response = await fetch(url, { ...options, headers });

  if (response.status === 401) {
    const refreshedToken = await tryRefreshToken();
    if (refreshedToken) {
      const retryHeaders = {
        ...headers,
        'Authorization': `Bearer ${refreshedToken}`
      };
      response = await fetch(url, { ...options, headers: retryHeaders });
    }
  }

  return handleResponse(response);
}

export const documentsApi = {
  // Document Types
  async getDocumentTypes() {
    return fetchWithAuth(`${API_BASE_URL}/documents/types/`);
  },

  // Document List with filtering & search
  async getDocuments(params = {}) {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') {
        query.append(k, v);
      }
    });
    return fetchWithAuth(`${API_BASE_URL}/documents/?${query.toString()}`);
  },

  // Document Detail
  async getDocumentDetail(id) {
    return fetchWithAuth(`${API_BASE_URL}/documents/${id}/`);
  },

  // Secure Document Viewer Data
  async getViewerData(id) {
    return fetchWithAuth(`${API_BASE_URL}/documents/${id}/viewer/`);
  },

  // Presigned Download URL
  async getDownloadUrl(id) {
    return fetchWithAuth(`${API_BASE_URL}/documents/${id}/download/`);
  },

  // Single / Presigned Upload Workflow
  async initiateUpload(data) {
    return fetchWithAuth(`${API_BASE_URL}/documents/upload/initiate/`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async completeUpload(payload) {
    const isFormData = payload instanceof FormData;
    return fetchWithAuth(`${API_BASE_URL}/documents/upload/complete/`, {
      method: 'POST',
      body: isFormData ? payload : JSON.stringify(payload),
    });
  },

  // Upload New Version
  async uploadNewVersion(id, formData) {
    return fetchWithAuth(`${API_BASE_URL}/documents/${id}/versions/`, {
      method: 'POST',
      body: formData,
    });
  },

  // Version History
  async getVersions(id) {
    return fetchWithAuth(`${API_BASE_URL}/documents/${id}/versions/`);
  },

  // Verification
  async verifyDocument(id, status, reason = '') {
    return fetchWithAuth(`${API_BASE_URL}/documents/${id}/verify/`, {
      method: 'POST',
      body: JSON.stringify({ status, reason }),
    });
  },

  // Archive / Restore
  async archiveDocument(id) {
    return fetchWithAuth(`${API_BASE_URL}/documents/${id}/archive/`, {
      method: 'POST',
    });
  },

  async restoreDocument(id) {
    return fetchWithAuth(`${API_BASE_URL}/documents/${id}/restore/`, {
      method: 'POST',
    });
  },

  // Delete
  async deleteDocument(id) {
    return fetchWithAuth(`${API_BASE_URL}/documents/${id}/`, {
      method: 'DELETE',
    });
  },

  // Expiring Documents
  async getExpiringDocuments(days = 30) {
    return fetchWithAuth(`${API_BASE_URL}/documents/expiring/?days=${days}`);
  },

  // Templates
  async getTemplates() {
    return fetchWithAuth(`${API_BASE_URL}/documents/templates/`);
  },

  async createTemplate(data) {
    return fetchWithAuth(`${API_BASE_URL}/documents/templates/`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async generateFromTemplate(id, data) {
    return fetchWithAuth(`${API_BASE_URL}/documents/templates/${id}/generate/`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Storage Health Check
  async checkStorageHealth() {
    return fetchWithAuth(`${API_BASE_URL}/documents/health/storage/`);
  }
};
