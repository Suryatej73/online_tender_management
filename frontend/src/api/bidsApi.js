import { getAuthToken, tryRefreshToken, ensureAuthToken } from './tendersApi';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

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
  const headers = {
    'Content-Type': 'application/json',
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

function getAuthHeaders() {
  const token = getAuthToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
}

function getMultipartHeaders() {
  const token = getAuthToken();
  return {
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
}

export const bidsApi = {
  // ────────────── Dashboard ──────────────
  async getDashboard() {
    return fetchWithAuth(`${API_BASE_URL}/bids/dashboard/`);
  },

  // ────────────── Bid CRUD ──────────────
  async getBids(filters = {}) {
    const query = new URLSearchParams();
    if (filters.search) query.append('search', filters.search);
    if (filters.status) query.append('status', filters.status);
    if (filters.tender) query.append('tender', filters.tender);
    if (filters.page) query.append('page', filters.page);
    if (filters.limit) query.append('limit', filters.limit);

    return fetchWithAuth(`${API_BASE_URL}/bids/?${query.toString()}`);
  },

  async createBid(tenderId, vendorId = null) {
    const body = { tender_id: tenderId };
    if (vendorId) body.vendor_id = vendorId;
    return fetchWithAuth(`${API_BASE_URL}/bids/`, {
      method: 'POST',
      body: JSON.stringify(body)
    });
  },

  async getBidDetail(bidId) {
    return fetchWithAuth(`${API_BASE_URL}/bids/${bidId}/`);
  },

  async updateBid(bidId, data) {
    return fetchWithAuth(`${API_BASE_URL}/bids/${bidId}/`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    });
  },

  // ────────────── Submission ──────────────
  async submitBid(bidId) {
    return fetchWithAuth(`${API_BASE_URL}/bids/${bidId}/submit/`, {
      method: 'POST'
    });
  },

  // ────────────── Technical Bid ──────────────
  async getTechnicalBid(bidId) {
    return fetchWithAuth(`${API_BASE_URL}/bids/${bidId}/technical/`);
  },

  async saveTechnicalBid(bidId, data) {
    return fetchWithAuth(`${API_BASE_URL}/bids/${bidId}/technical/`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  // ────────────── Financial Bid ──────────────
  async getFinancialBid(bidId) {
    return fetchWithAuth(`${API_BASE_URL}/bids/${bidId}/financial/`);
  },

  async saveFinancialBid(bidId, data) {
    return fetchWithAuth(`${API_BASE_URL}/bids/${bidId}/financial/`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  // ────────────── Documents ──────────────
  async getBidDocuments(bidId, docType = '') {
    const url = docType
      ? `${API_BASE_URL}/bids/${bidId}/documents/?type=${docType}`
      : `${API_BASE_URL}/bids/${bidId}/documents/`;
    return fetchWithAuth(url);
  },

  async uploadBidDocument(bidId, docData) {
    return fetchWithAuth(`${API_BASE_URL}/bids/${bidId}/documents/`, {
      method: 'POST',
      body: JSON.stringify(docData)
    });
  },

  async deleteBidDocument(bidId, docId) {
    return fetchWithAuth(`${API_BASE_URL}/bids/${bidId}/documents/${docId}/`, {
      method: 'DELETE'
    });
  },

  // ────────────── Amendment ──────────────
  async getAmendments(bidId) {
    return fetchWithAuth(`${API_BASE_URL}/bids/${bidId}/amend/`);
  },

  async createAmendment(bidId, amendmentData) {
    return fetchWithAuth(`${API_BASE_URL}/bids/${bidId}/amend/`, {
      method: 'POST',
      body: JSON.stringify(amendmentData)
    });
  },

  // ────────────── Withdrawal ──────────────
  async withdrawBid(bidId, reason) {
    return fetchWithAuth(`${API_BASE_URL}/bids/${bidId}/withdraw/`, {
      method: 'POST',
      body: JSON.stringify({ reason })
    });
  },

  // ────────────── Version History ──────────────
  async getBidVersions(bidId) {
    return fetchWithAuth(`${API_BASE_URL}/bids/${bidId}/versions/`);
  },

  // ────────────── Integrity ──────────────
  async getIntegrityStatus(bidId) {
    return fetchWithAuth(`${API_BASE_URL}/bids/${bidId}/integrity/`);
  },

  async verifyIntegrity(bidId) {
    return fetchWithAuth(`${API_BASE_URL}/bids/${bidId}/integrity/`, {
      method: 'POST'
    });
  },

  // ────────────── Bid Opening ──────────────
  async getOpeningStatus(tenderId) {
    return fetchWithAuth(`${API_BASE_URL}/tenders/${tenderId}/opening/`);
  },

  async executeOpeningAction(tenderId, action, notes = '') {
    return fetchWithAuth(`${API_BASE_URL}/tenders/${tenderId}/opening/`, {
      method: 'POST',
      body: JSON.stringify({ action, notes })
    });
  },

  // ────────────── Audit Logs ──────────────
  async getBidAuditLogs(bidId) {
    return fetchWithAuth(`${API_BASE_URL}/bids/${bidId}/audit-logs/`);
  },

  async getAllBidAuditLogs(filters = {}) {
    const query = new URLSearchParams();
    if (filters.action) query.append('action', filters.action);
    if (filters.actor) query.append('actor', filters.actor);
    if (filters.outcome) query.append('outcome', filters.outcome);
    return fetchWithAuth(`${API_BASE_URL}/bids/audit-logs/?${query.toString()}`);
  },

  // ────────────── Evaluation & Award ──────────────
  async evaluateBid(bidId, evaluationData = {}) {
    return fetchWithAuth(`${API_BASE_URL}/bids/${bidId}/evaluate/`, {
      method: 'POST',
      body: JSON.stringify(evaluationData)
    });
  },

  async awardBid(bidId, awardData = {}) {
    return fetchWithAuth(`${API_BASE_URL}/bids/${bidId}/award/`, {
      method: 'POST',
      body: JSON.stringify(awardData)
    });
  },
};
