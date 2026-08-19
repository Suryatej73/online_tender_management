const API_BASE_URL = 'http://localhost:8000/api/v1/tenders';

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
  // ── Dashboard ──
  async getDashboard() {
    const response = await fetch(`${API_BASE_URL}/dashboard/`, {
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  // ── Tender CRUD ──
  async getTenders(filters = {}) {
    const query = new URLSearchParams();
    if (filters.search) query.append('search', filters.search);
    if (filters.status) query.append('status', filters.status);
    if (filters.category) query.append('category', filters.category);
    if (filters.organization) query.append('organization', filters.organization);
    if (filters.is_two_envelope) query.append('is_two_envelope', filters.is_two_envelope);
    if (filters.is_reverse_auction) query.append('is_reverse_auction', filters.is_reverse_auction);
    if (filters.min_cost) query.append('min_cost', filters.min_cost);
    if (filters.max_cost) query.append('max_cost', filters.max_cost);
    if (filters.sort_by) query.append('sort_by', filters.sort_by);
    if (filters.expiring_soon) query.append('expiring_soon', filters.expiring_soon);

    const response = await fetch(`${API_BASE_URL}/?${query.toString()}`, {
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  async createTender(tenderData) {
    const response = await fetch(`${API_BASE_URL}/`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(tenderData)
    });
    return handleResponse(response);
  },

  async getTender(tenderId) {
    const response = await fetch(`${API_BASE_URL}/${tenderId}/`, {
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  async updateTender(tenderId, data) {
    const response = await fetch(`${API_BASE_URL}/${tenderId}/`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(response);
  },

  async deleteTender(tenderId) {
    const response = await fetch(`${API_BASE_URL}/${tenderId}/`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  // ── Lifecycle ──
  async transitionTender(tenderId, newStatus) {
    const response = await fetch(`${API_BASE_URL}/${tenderId}/transition/`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ status: newStatus })
    });
    return handleResponse(response);
  },

  async bulkTransition(tenderIds, newStatus) {
    const response = await fetch(`${API_BASE_URL}/bulk-transition/`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ tender_ids: tenderIds, status: newStatus })
    });
    return handleResponse(response);
  },

  // ── BOQ Items ──
  async getBOQItems(tenderId) {
    const response = await fetch(`${API_BASE_URL}/${tenderId}/boq-items/`, {
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  async addBOQItem(tenderId, itemData) {
    const response = await fetch(`${API_BASE_URL}/${tenderId}/boq-items/`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(itemData)
    });
    return handleResponse(response);
  },

  async updateBOQItem(tenderId, itemId, data) {
    const response = await fetch(`${API_BASE_URL}/${tenderId}/boq-items/${itemId}/`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(response);
  },

  async deleteBOQItem(tenderId, itemId) {
    const response = await fetch(`${API_BASE_URL}/${tenderId}/boq-items/${itemId}/`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  // ── Amendments ──
  async getAmendments(tenderId) {
    const response = await fetch(`${API_BASE_URL}/${tenderId}/amendments/`, {
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  async createAmendment(tenderId, amendmentData) {
    const response = await fetch(`${API_BASE_URL}/${tenderId}/amendments/`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(amendmentData)
    });
    return handleResponse(response);
  },

  // ── Categories ──
  async getCategories() {
    const response = await fetch(`${API_BASE_URL}/categories/`, {
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  async createCategory(categoryData) {
    const response = await fetch(`${API_BASE_URL}/categories/`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(categoryData)
    });
    return handleResponse(response);
  },

  // ── Templates ──
  async getTemplates() {
    const response = await fetch(`${API_BASE_URL}/templates/`, {
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  async createTemplate(templateData) {
    const response = await fetch(`${API_BASE_URL}/templates/`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(templateData)
    });
    return handleResponse(response);
  },

  async createTenderFromTemplate(templateId, tenderData) {
    const response = await fetch(`${API_BASE_URL}/templates/${templateId}/create-tender/`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(tenderData)
    });
    return handleResponse(response);
  },
};
