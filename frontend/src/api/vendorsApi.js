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

export const vendorsApi = {
  // ────────────── Dashboard ──────────────
  async getDashboard() {
    return fetchWithAuth(`${API_BASE_URL}/vendors/dashboard/`);
  },

  // ────────────── Vendor CRUD ──────────────
  async getVendors(filters = {}) {
    const query = new URLSearchParams();
    Object.entries(filters).forEach(([key, val]) => {
      if (val) query.append(key, val);
    });
    return fetchWithAuth(`${API_BASE_URL}/vendors/?${query.toString()}`);
  },

  async getVendorDetail(id) {
    return fetchWithAuth(`${API_BASE_URL}/vendors/${id}/`);
  },

  async createVendor(data) {
    return fetchWithAuth(`${API_BASE_URL}/vendors/`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async updateVendor(id, data) {
    return fetchWithAuth(`${API_BASE_URL}/vendors/${id}/`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  async deleteVendor(id) {
    return fetchWithAuth(`${API_BASE_URL}/vendors/${id}/`, {
      method: 'DELETE'
    });
  },

  // ────────────── Verification ──────────────
  async getPendingVendors() {
    return fetchWithAuth(`${API_BASE_URL}/vendors/pending/`);
  },

  async verifyVendor(id, reason = '') {
    return fetchWithAuth(`${API_BASE_URL}/vendors/${id}/verify/`, {
      method: 'POST',
      body: JSON.stringify({ reason })
    });
  },

  async rejectVendor(id, reason = '') {
    return fetchWithAuth(`${API_BASE_URL}/vendors/${id}/reject/`, {
      method: 'POST',
      body: JSON.stringify({ reason })
    });
  },

  // ────────────── Documents ──────────────
  async getVendorDocuments(vendorId, docStatus = '') {
    const url = docStatus
      ? `${API_BASE_URL}/vendors/${vendorId}/documents/?status=${docStatus}`
      : `${API_BASE_URL}/vendors/${vendorId}/documents/`;
    return fetchWithAuth(url);
  },

  async uploadDocument(vendorId, docData) {
    return fetchWithAuth(`${API_BASE_URL}/vendors/${vendorId}/documents/`, {
      method: 'POST',
      body: JSON.stringify(docData)
    });
  },

  async verifyDocument(docId, action, remarks = '') {
    return fetchWithAuth(`${API_BASE_URL}/documents/${docId}/verify/`, {
      method: 'POST',
      body: JSON.stringify({ action, remarks })
    });
  },

  async deleteDocument(vendorId, docId) {
    return fetchWithAuth(`${API_BASE_URL}/vendors/${vendorId}/documents/${docId}/`, {
      method: 'DELETE'
    });
  },

  // ────────────── Categories ──────────────
  async getVendorCategories() {
    return fetchWithAuth(`${API_BASE_URL}/vendor-categories/`);
  },

  async createVendorCategory(data) {
    return fetchWithAuth(`${API_BASE_URL}/vendor-categories/`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async assignCategory(vendorId, categoryId, data = {}) {
    return fetchWithAuth(`${API_BASE_URL}/vendors/${vendorId}/categories/`, {
      method: 'POST',
      body: JSON.stringify({ category_id: categoryId, ...data })
    });
  },

  // ────────────── Ratings ──────────────
  async getVendorRatings(vendorId) {
    return fetchWithAuth(`${API_BASE_URL}/vendors/${vendorId}/ratings/`);
  },

  async submitRating(vendorId, ratingData) {
    return fetchWithAuth(`${API_BASE_URL}/vendors/${vendorId}/ratings/`, {
      method: 'POST',
      body: JSON.stringify(ratingData)
    });
  },

  // ────────────── Reviews ──────────────
  async getVendorReviews(vendorId) {
    return fetchWithAuth(`${API_BASE_URL}/vendors/${vendorId}/reviews/`);
  },

  async submitReview(vendorId, reviewData) {
    return fetchWithAuth(`${API_BASE_URL}/vendors/${vendorId}/reviews/`, {
      method: 'POST',
      body: JSON.stringify(reviewData)
    });
  },

  async moderateReview(reviewId, status, remarks = '') {
    return fetchWithAuth(`${API_BASE_URL}/reviews/${reviewId}/moderate/`, {
      method: 'POST',
      body: JSON.stringify({ status, remarks })
    });
  },

  async respondToReview(vendorId, reviewId, response_text) {
    return fetchWithAuth(`${API_BASE_URL}/vendors/${vendorId}/reviews/${reviewId}/respond/`, {
      method: 'POST',
      body: JSON.stringify({ response: response_text })
    });
  },

  // ────────────── Performance ──────────────
  async getVendorPerformance(vendorId) {
    return fetchWithAuth(`${API_BASE_URL}/vendors/${vendorId}/performance/`);
  },

  // ────────────── Status Management ──────────────
  async suspendVendor(id, reason, remarks = '', endDate = null) {
    return fetchWithAuth(`${API_BASE_URL}/vendors/${id}/suspend/`, {
      method: 'POST',
      body: JSON.stringify({ reason, remarks, end_date: endDate })
    });
  },

  async blacklistVendor(id, reason, description = '', isPermanent = false, evidenceFile = null) {
    return fetchWithAuth(`${API_BASE_URL}/vendors/${id}/blacklist/`, {
      method: 'POST',
      body: JSON.stringify({ reason, description, is_permanent: isPermanent, evidence_file: evidenceFile })
    });
  },

  async reinstateVendor(id, reason = '') {
    return fetchWithAuth(`${API_BASE_URL}/vendors/${id}/reinstate/`, {
      method: 'POST',
      body: JSON.stringify({ reason })
    });
  },

  // ────────────── Audit Logs ──────────────
  async getVendorAuditLogs(vendorId) {
    return fetchWithAuth(`${API_BASE_URL}/vendors/${vendorId}/audit-logs/`);
  },

  async getAllAuditLogs(filters = {}) {
    const query = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => { if (v) query.append(k, v); });
    return fetchWithAuth(`${API_BASE_URL}/vendor-audit-logs/?${query.toString()}`);
  },

  // ────────────── Notifications ──────────────
  async getVendorNotifications(vendorId) {
    return fetchWithAuth(`${API_BASE_URL}/vendors/${vendorId}/notifications/`);
  },

  async markNotificationsRead(vendorId, notificationIds = []) {
    return fetchWithAuth(`${API_BASE_URL}/vendors/${vendorId}/notifications/`, {
      method: 'POST',
      body: JSON.stringify({ notification_ids: notificationIds })
    });
  },

  // ────────────── Eligibility ──────────────
  async checkEligibility(vendorId) {
    return fetchWithAuth(`${API_BASE_URL}/vendors/${vendorId}/eligibility/`);
  },

  // ────────────── Certifications ──────────────
  async getVendorCertifications(vendorId) {
    return fetchWithAuth(`${API_BASE_URL}/vendors/${vendorId}/certifications/`);
  },

  async addCertification(vendorId, certData) {
    return fetchWithAuth(`${API_BASE_URL}/vendors/${vendorId}/certifications/`, {
      method: 'POST',
      body: JSON.stringify(certData)
    });
  },

  // ────────────── Experience ──────────────
  async getVendorExperience(vendorId) {
    return fetchWithAuth(`${API_BASE_URL}/vendors/${vendorId}/experience/`);
  },

  async addExperience(vendorId, expData) {
    return fetchWithAuth(`${API_BASE_URL}/vendors/${vendorId}/experience/`, {
      method: 'POST',
      body: JSON.stringify(expData)
    });
  },
};
