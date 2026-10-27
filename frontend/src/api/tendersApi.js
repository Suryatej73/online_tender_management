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
    if (response.status === 401) {
      throw new Error('Authentication required: Your session has expired or you are not signed in. Please sign in as a Tender Manager or Administrator.');
    }
    if (response.status === 403) {
      throw new Error('Permission Denied: Your account role does not have authorization to create or modify tenders (requires Tender Manager or Admin role).');
    }
    let errorMsg = 'API Request failed';
    try {
      const errorData = await response.json();
      if (typeof errorData === 'object' && errorData !== null) {
        if (errorData.errors && typeof errorData.errors === 'object' && Object.keys(errorData.errors).length > 0) {
          const fieldErrors = Object.entries(errorData.errors)
            .map(([field, msgs]) => `${field === 'non_field_errors' ? '' : field + ': '}${Array.isArray(msgs) ? msgs.join(', ') : msgs}`)
            .join(' | ');
          errorMsg = errorData.message ? `${errorData.message}` : fieldErrors;
        } else {
          errorMsg = errorData.error || errorData.detail || errorData.message || Object.entries(errorData).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`).join('; ');
        }
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
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...(options.headers || {})
  };

  let response = await fetch(url, { ...options, headers });

  // If 401 Unauthorized, attempt automatic token refresh once
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

export const tendersApi = {
  // Tender CRUD & Search
  async getDashboard() {
    return fetchWithAuth(`${API_BASE_URL}/tenders/dashboard/`);
  },

  async getTenders(filters = {}) {
    const query = new URLSearchParams();
    if (filters.search) query.append('search', filters.search);
    if (filters.status) query.append('status', filters.status);
    if (filters.category) query.append('category', filters.category);
    if (filters.organization) query.append('organization', filters.organization);
    if (filters.minBudget) query.append('minBudget', filters.minBudget);
    if (filters.maxBudget) query.append('maxBudget', filters.maxBudget);
    if (filters.page) query.append('page', filters.page);
    if (filters.limit) query.append('limit', filters.limit);
    if (filters.sortBy) query.append('sortBy', filters.sortBy);
    if (filters.order) query.append('order', filters.order);

    return fetchWithAuth(`${API_BASE_URL}/tenders/?${query.toString()}`);
  },

  async createTender(tenderData) {
    return fetchWithAuth(`${API_BASE_URL}/tenders/`, {
      method: 'POST',
      body: JSON.stringify(tenderData)
    });
  },

  async getTenderDetail(id) {
    return fetchWithAuth(`${API_BASE_URL}/tenders/${id}/`);
  },

  async updateTender(id, data) {
    return fetchWithAuth(`${API_BASE_URL}/tenders/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    });
  },

  async deleteTender(id) {
    return fetchWithAuth(`${API_BASE_URL}/tenders/${id}/`, {
      method: 'DELETE'
    });
  },

  // State Machine Transition
  async transitionTender(id, targetStatus, reason = '') {
    return fetchWithAuth(`${API_BASE_URL}/tenders/${id}/transition/`, {
      method: 'POST',
      body: JSON.stringify({ targetStatus, reason })
    });
  },

  // Categories
  async getCategories() {
    return fetchWithAuth(`${API_BASE_URL}/tender-categories/`);
  },

  async createCategory(categoryData) {
    return fetchWithAuth(`${API_BASE_URL}/tender-categories/`, {
      method: 'POST',
      body: JSON.stringify(categoryData)
    });
  },

  // Templates
  async getTemplates() {
    return fetchWithAuth(`${API_BASE_URL}/tender-templates/`);
  },

  async applyTemplate(templateId) {
    return fetchWithAuth(`${API_BASE_URL}/tender-templates/${templateId}/apply/`, {
      method: 'POST'
    });
  },

  // Amendments
  async getAmendments(tenderId) {
    return fetchWithAuth(`${API_BASE_URL}/tenders/${tenderId}/amendments/`);
  },

  async createAmendment(tenderId, amendmentData) {
    return fetchWithAuth(`${API_BASE_URL}/tenders/${tenderId}/amendments/`, {
      method: 'POST',
      body: JSON.stringify(amendmentData)
    });
  },

  async publishAmendment(tenderId, amendmentId) {
    return fetchWithAuth(`${API_BASE_URL}/tenders/${tenderId}/amendments/${amendmentId}/publish/`, {
      method: 'POST'
    });
  },

  // Versions
  async getTenderVersions(tenderId) {
    return fetchWithAuth(`${API_BASE_URL}/tenders/${tenderId}/versions/`);
  }
};
