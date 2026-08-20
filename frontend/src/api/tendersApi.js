const API_BASE_URL = 'http://localhost:8000/api/v1';

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

function getAuthHeaders() {
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
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
}

export const tendersApi = {
  // Tender CRUD & Search
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

    const response = await fetch(`${API_BASE_URL}/tenders/?${query.toString()}`, {
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  async createTender(tenderData) {
    const response = await fetch(`${API_BASE_URL}/tenders/`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(tenderData)
    });
    return handleResponse(response);
  },

  async getTenderDetail(id) {
    const response = await fetch(`${API_BASE_URL}/tenders/${id}/`, {
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  async updateTender(id, data) {
    const response = await fetch(`${API_BASE_URL}/tenders/${id}/`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(response);
  },

  async deleteTender(id) {
    const response = await fetch(`${API_BASE_URL}/tenders/${id}/`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  // State Machine Transition
  async transitionTender(id, targetStatus, reason = '') {
    const response = await fetch(`${API_BASE_URL}/tenders/${id}/transition/`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ targetStatus, reason })
    });
    return handleResponse(response);
  },

  // Categories
  async getCategories() {
    const response = await fetch(`${API_BASE_URL}/tender-categories/`, {
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  async createCategory(categoryData) {
    const response = await fetch(`${API_BASE_URL}/tender-categories/`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(categoryData)
    });
    return handleResponse(response);
  },

  // Templates
  async getTemplates() {
    const response = await fetch(`${API_BASE_URL}/tender-templates/`, {
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  async applyTemplate(templateId) {
    const response = await fetch(`${API_BASE_URL}/tender-templates/${templateId}/apply/`, {
      method: 'POST',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  // Amendments
  async getAmendments(tenderId) {
    const response = await fetch(`${API_BASE_URL}/tenders/${tenderId}/amendments/`, {
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  async createAmendment(tenderId, amendmentData) {
    const response = await fetch(`${API_BASE_URL}/tenders/${tenderId}/amendments/`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(amendmentData)
    });
    return handleResponse(response);
  },

  async publishAmendment(tenderId, amendmentId) {
    const response = await fetch(`${API_BASE_URL}/tenders/${tenderId}/amendments/${amendmentId}/publish/`, {
      method: 'POST',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  // Versions
  async getTenderVersions(tenderId) {
    const response = await fetch(`${API_BASE_URL}/tenders/${tenderId}/versions/`, {
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  }
};
