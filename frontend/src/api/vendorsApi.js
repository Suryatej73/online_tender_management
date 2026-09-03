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

export const vendorsApi = {
  // ────────────── Dashboard ──────────────
  async getDashboard() {
    const response = await fetch(`${API_BASE_URL}/vendors/dashboard/`, { headers: getAuthHeaders() });
    return handleResponse(response);
  },

  // ────────────── Vendor CRUD ──────────────
  async getVendors(filters = {}) {
    const query = new URLSearchParams();
    Object.entries(filters).forEach(([key, val]) => {
      if (val) query.append(key, val);
    });
    const response = await fetch(`${API_BASE_URL}/vendors/?${query.toString()}`, { headers: getAuthHeaders() });
    return handleResponse(response);
  },

  async getVendorDetail(id) {
    const response = await fetch(`${API_BASE_URL}/vendors/${id}/`, { headers: getAuthHeaders() });
    return handleResponse(response);
  },

  async createVendor(data) {
    const response = await fetch(`${API_BASE_URL}/vendors/`, {
      method: 'POST', headers: getAuthHeaders(), body: JSON.stringify(data)
    });
    return handleResponse(response);
  },

  async updateVendor(id, data) {
    const response = await fetch(`${API_BASE_URL}/vendors/${id}/`, {
      method: 'PUT', headers: getAuthHeaders(), body: JSON.stringify(data)
    });
    return handleResponse(response);
  },

  async deleteVendor(id) {
    const response = await fetch(`${API_BASE_URL}/vendors/${id}/`, {
      method: 'DELETE', headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  // ────────────── Verification ──────────────
  async getPendingVendors() {
    const response = await fetch(`${API_BASE_URL}/vendors/pending/`, { headers: getAuthHeaders() });
    return handleResponse(response);
  },

  async verifyVendor(id, reason = '') {
    const response = await fetch(`${API_BASE_URL}/vendors/${id}/verify/`, {
      method: 'POST', headers: getAuthHeaders(), body: JSON.stringify({ reason })
    });
    return handleResponse(response);
  },

  async rejectVendor(id, reason = '') {
    const response = await fetch(`${API_BASE_URL}/vendors/${id}/reject/`, {
      method: 'POST', headers: getAuthHeaders(), body: JSON.stringify({ reason })
    });
    return handleResponse(response);
  },

  // ────────────── Documents ──────────────
  async getVendorDocuments(vendorId, docStatus = '') {
    const url = docStatus
      ? `${API_BASE_URL}/vendors/${vendorId}/documents/?status=${docStatus}`
      : `${API_BASE_URL}/vendors/${vendorId}/documents/`;
    const response = await fetch(url, { headers: getAuthHeaders() });
    return handleResponse(response);
  },

  async uploadDocument(vendorId, docData) {
    const response = await fetch(`${API_BASE_URL}/vendors/${vendorId}/documents/`, {
      method: 'POST', headers: getAuthHeaders(), body: JSON.stringify(docData)
    });
    return handleResponse(response);
  },

  async verifyDocument(docId, action, remarks = '') {
    const response = await fetch(`${API_BASE_URL}/documents/${docId}/verify/`, {
      method: 'POST', headers: getAuthHeaders(), body: JSON.stringify({ action, remarks })
    });
    return handleResponse(response);
  },

  async deleteDocument(vendorId, docId) {
    const response = await fetch(`${API_BASE_URL}/vendors/${vendorId}/documents/${docId}/`, {
      method: 'DELETE', headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  // ────────────── Categories ──────────────
  async getVendorCategories() {
    const response = await fetch(`${API_BASE_URL}/vendor-categories/`, { headers: getAuthHeaders() });
    return handleResponse(response);
  },

  async createVendorCategory(data) {
    const response = await fetch(`${API_BASE_URL}/vendor-categories/`, {
      method: 'POST', headers: getAuthHeaders(), body: JSON.stringify(data)
    });
    return handleResponse(response);
  },

  async assignCategory(vendorId, categoryId, data = {}) {
    const response = await fetch(`${API_BASE_URL}/vendors/${vendorId}/categories/`, {
      method: 'POST', headers: getAuthHeaders(), body: JSON.stringify({ category_id: categoryId, ...data })
    });
    return handleResponse(response);
  },

  // ────────────── Ratings ──────────────
  async getVendorRatings(vendorId) {
    const response = await fetch(`${API_BASE_URL}/vendors/${vendorId}/ratings/`, { headers: getAuthHeaders() });
    return handleResponse(response);
  },

  async submitRating(vendorId, ratingData) {
    const response = await fetch(`${API_BASE_URL}/vendors/${vendorId}/ratings/`, {
      method: 'POST', headers: getAuthHeaders(), body: JSON.stringify(ratingData)
    });
    return handleResponse(response);
  },

  // ────────────── Reviews ──────────────
  async getVendorReviews(vendorId) {
    const response = await fetch(`${API_BASE_URL}/vendors/${vendorId}/reviews/`, { headers: getAuthHeaders() });
    return handleResponse(response);
  },

  async submitReview(vendorId, reviewData) {
    const response = await fetch(`${API_BASE_URL}/vendors/${vendorId}/reviews/`, {
      method: 'POST', headers: getAuthHeaders(), body: JSON.stringify(reviewData)
    });
    return handleResponse(response);
  },

  async moderateReview(reviewId, status, remarks = '') {
    const response = await fetch(`${API_BASE_URL}/reviews/${reviewId}/moderate/`, {
      method: 'POST', headers: getAuthHeaders(), body: JSON.stringify({ status, remarks })
    });
    return handleResponse(response);
  },

  async respondToReview(vendorId, reviewId, response_text) {
    const resp = await fetch(`${API_BASE_URL}/vendors/${vendorId}/reviews/${reviewId}/respond/`, {
      method: 'POST', headers: getAuthHeaders(), body: JSON.stringify({ response: response_text })
    });
    return handleResponse(resp);
  },

  // ────────────── Performance ──────────────
  async getVendorPerformance(vendorId) {
    const response = await fetch(`${API_BASE_URL}/vendors/${vendorId}/performance/`, { headers: getAuthHeaders() });
    return handleResponse(response);
  },

  // ────────────── Status Management ──────────────
  async suspendVendor(id, reason, remarks = '', endDate = null) {
    const response = await fetch(`${API_BASE_URL}/vendors/${id}/suspend/`, {
      method: 'POST', headers: getAuthHeaders(), body: JSON.stringify({ reason, remarks, end_date: endDate })
    });
    return handleResponse(response);
  },

  async blacklistVendor(id, reason, description = '', isPermanent = false, evidenceFile = null) {
    const response = await fetch(`${API_BASE_URL}/vendors/${id}/blacklist/`, {
      method: 'POST', headers: getAuthHeaders(), body: JSON.stringify({ reason, description, is_permanent: isPermanent, evidence_file: evidenceFile })
    });
    return handleResponse(response);
  },

  async reinstateVendor(id, reason = '') {
    const response = await fetch(`${API_BASE_URL}/vendors/${id}/reinstate/`, {
      method: 'POST', headers: getAuthHeaders(), body: JSON.stringify({ reason })
    });
    return handleResponse(response);
  },

  // ────────────── Audit Logs ──────────────
  async getVendorAuditLogs(vendorId) {
    const response = await fetch(`${API_BASE_URL}/vendors/${vendorId}/audit-logs/`, { headers: getAuthHeaders() });
    return handleResponse(response);
  },

  async getAllAuditLogs(filters = {}) {
    const query = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => { if (v) query.append(k, v); });
    const response = await fetch(`${API_BASE_URL}/vendor-audit-logs/?${query.toString()}`, { headers: getAuthHeaders() });
    return handleResponse(response);
  },

  // ────────────── Notifications ──────────────
  async getVendorNotifications(vendorId) {
    const response = await fetch(`${API_BASE_URL}/vendors/${vendorId}/notifications/`, { headers: getAuthHeaders() });
    return handleResponse(response);
  },

  async markNotificationsRead(vendorId, notificationIds = []) {
    const response = await fetch(`${API_BASE_URL}/vendors/${vendorId}/notifications/`, {
      method: 'POST', headers: getAuthHeaders(), body: JSON.stringify({ notification_ids: notificationIds })
    });
    return handleResponse(response);
  },

  // ────────────── Eligibility ──────────────
  async checkEligibility(vendorId) {
    const response = await fetch(`${API_BASE_URL}/vendors/${vendorId}/eligibility/`, { headers: getAuthHeaders() });
    return handleResponse(response);
  },

  // ────────────── Certifications ──────────────
  async getVendorCertifications(vendorId) {
    const response = await fetch(`${API_BASE_URL}/vendors/${vendorId}/certifications/`, { headers: getAuthHeaders() });
    return handleResponse(response);
  },

  async addCertification(vendorId, certData) {
    const response = await fetch(`${API_BASE_URL}/vendors/${vendorId}/certifications/`, {
      method: 'POST', headers: getAuthHeaders(), body: JSON.stringify(certData)
    });
    return handleResponse(response);
  },

  // ────────────── Experience ──────────────
  async getVendorExperience(vendorId) {
    const response = await fetch(`${API_BASE_URL}/vendors/${vendorId}/experience/`, { headers: getAuthHeaders() });
    return handleResponse(response);
  },

  async addExperience(vendorId, expData) {
    const response = await fetch(`${API_BASE_URL}/vendors/${vendorId}/experience/`, {
      method: 'POST', headers: getAuthHeaders(), body: JSON.stringify(expData)
    });
    return handleResponse(response);
  },
};
