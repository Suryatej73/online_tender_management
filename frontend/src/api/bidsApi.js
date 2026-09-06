const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';


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

function getMultipartHeaders() {
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
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
}

export const bidsApi = {
  // ────────────── Dashboard ──────────────
  async getDashboard() {
    const response = await fetch(`${API_BASE_URL}/bids/dashboard/`, {
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  // ────────────── Bid CRUD ──────────────
  async getBids(filters = {}) {
    const query = new URLSearchParams();
    if (filters.search) query.append('search', filters.search);
    if (filters.status) query.append('status', filters.status);
    if (filters.tender) query.append('tender', filters.tender);
    if (filters.page) query.append('page', filters.page);
    if (filters.limit) query.append('limit', filters.limit);

    const response = await fetch(`${API_BASE_URL}/bids/?${query.toString()}`, {
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  async createBid(tenderId, vendorId = null) {
    const body = { tender_id: tenderId };
    if (vendorId) body.vendor_id = vendorId;
    const response = await fetch(`${API_BASE_URL}/bids/`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(body)
    });
    return handleResponse(response);
  },

  async getBidDetail(bidId) {
    const response = await fetch(`${API_BASE_URL}/bids/${bidId}/`, {
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  async updateBid(bidId, data) {
    const response = await fetch(`${API_BASE_URL}/bids/${bidId}/`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(response);
  },

  // ────────────── Submission ──────────────
  async submitBid(bidId) {
    const response = await fetch(`${API_BASE_URL}/bids/${bidId}/submit/`, {
      method: 'POST',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  // ────────────── Technical Bid ──────────────
  async getTechnicalBid(bidId) {
    const response = await fetch(`${API_BASE_URL}/bids/${bidId}/technical/`, {
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  async saveTechnicalBid(bidId, data) {
    const response = await fetch(`${API_BASE_URL}/bids/${bidId}/technical/`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(response);
  },

  // ────────────── Financial Bid ──────────────
  async getFinancialBid(bidId) {
    const response = await fetch(`${API_BASE_URL}/bids/${bidId}/financial/`, {
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  async saveFinancialBid(bidId, data) {
    const response = await fetch(`${API_BASE_URL}/bids/${bidId}/financial/`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(response);
  },

  // ────────────── Documents ──────────────
  async getBidDocuments(bidId, docType = '') {
    const url = docType
      ? `${API_BASE_URL}/bids/${bidId}/documents/?type=${docType}`
      : `${API_BASE_URL}/bids/${bidId}/documents/`;
    const response = await fetch(url, { headers: getAuthHeaders() });
    return handleResponse(response);
  },

  async uploadBidDocument(bidId, docData) {
    const response = await fetch(`${API_BASE_URL}/bids/${bidId}/documents/`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(docData)
    });
    return handleResponse(response);
  },

  async deleteBidDocument(bidId, docId) {
    const response = await fetch(`${API_BASE_URL}/bids/${bidId}/documents/${docId}/`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  // ────────────── Amendment ──────────────
  async getAmendments(bidId) {
    const response = await fetch(`${API_BASE_URL}/bids/${bidId}/amend/`, {
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  async createAmendment(bidId, amendmentData) {
    const response = await fetch(`${API_BASE_URL}/bids/${bidId}/amend/`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(amendmentData)
    });
    return handleResponse(response);
  },

  // ────────────── Withdrawal ──────────────
  async withdrawBid(bidId, reason) {
    const response = await fetch(`${API_BASE_URL}/bids/${bidId}/withdraw/`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ reason })
    });
    return handleResponse(response);
  },

  // ────────────── Version History ──────────────
  async getBidVersions(bidId) {
    const response = await fetch(`${API_BASE_URL}/bids/${bidId}/versions/`, {
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  // ────────────── Integrity ──────────────
  async getIntegrityStatus(bidId) {
    const response = await fetch(`${API_BASE_URL}/bids/${bidId}/integrity/`, {
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  async verifyIntegrity(bidId) {
    const response = await fetch(`${API_BASE_URL}/bids/${bidId}/integrity/`, {
      method: 'POST',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  // ────────────── Bid Opening ──────────────
  async getOpeningStatus(tenderId) {
    const response = await fetch(`${API_BASE_URL}/tenders/${tenderId}/opening/`, {
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  async executeOpeningAction(tenderId, action, notes = '') {
    const response = await fetch(`${API_BASE_URL}/tenders/${tenderId}/opening/`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ action, notes })
    });
    return handleResponse(response);
  },

  // ────────────── Audit Logs ──────────────
  async getBidAuditLogs(bidId) {
    const response = await fetch(`${API_BASE_URL}/bids/${bidId}/audit-logs/`, {
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  async getAllBidAuditLogs(filters = {}) {
    const query = new URLSearchParams();
    if (filters.action) query.append('action', filters.action);
    if (filters.actor) query.append('actor', filters.actor);
    if (filters.outcome) query.append('outcome', filters.outcome);
    const response = await fetch(`${API_BASE_URL}/bids/audit-logs/?${query.toString()}`, {
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },
};
