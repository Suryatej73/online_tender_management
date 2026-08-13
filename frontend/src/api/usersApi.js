const API_BASE_URL = '/api/v1';

async function handleResponse(response) {
  if (!response.ok) {
    let errorMsg = 'API Request failed';
    try {
      const errorData = await response.json();
      errorMsg = errorData.error || errorData.message || JSON.stringify(errorData);
    } catch (e) {
      errorMsg = `HTTP Error ${response.status}: ${response.statusText}`;
    }
    throw new Error(errorMsg);
  }
  return response.json();
}

function getAuthHeaders() {
  const token = localStorage.getItem('access_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
}

export const usersApi = {
  async getUsers(filters = {}) {
    const query = new URLSearchParams();
    if (filters.search) query.append('search', filters.search);
    if (filters.role) query.append('role', filters.role);
    if (filters.organization) query.append('organization', filters.organization);
    if (filters.department) query.append('department', filters.department);
    if (filters.status) query.append('status', filters.status);
    if (filters.is_verified) query.append('is_verified', filters.is_verified);
    if (filters.sort_by) query.append('sort_by', filters.sort_by);

    const response = await fetch(`${API_BASE_URL}/users/?${query.toString()}`, {
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  async createUser(userData) {
    const response = await fetch(`${API_BASE_URL}/users/`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(userData)
    });
    return handleResponse(response);
  },

  async getUserDetail(userId) {
    const response = await fetch(`${API_BASE_URL}/users/${userId}/`, {
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  async updateUser(userId, data) {
    const response = await fetch(`${API_BASE_URL}/users/${userId}/`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(response);
  },

  async deleteUser(userId) {
    const response = await fetch(`${API_BASE_URL}/users/${userId}/`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  async suspendUser(userId) {
    const response = await fetch(`${API_BASE_URL}/users/${userId}/suspend/`, {
      method: 'POST',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  async activateUser(userId) {
    const response = await fetch(`${API_BASE_URL}/users/${userId}/activate/`, {
      method: 'POST',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  async verifyUser(userId) {
    const response = await fetch(`${API_BASE_URL}/users/${userId}/verify/`, {
      method: 'POST',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  async resetUserPassword(userId, newPassword) {
    const response = await fetch(`${API_BASE_URL}/users/${userId}/reset-password/`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ new_password: newPassword })
    });
    return handleResponse(response);
  },

  async getUserActivity(userId) {
    const response = await fetch(`${API_BASE_URL}/users/${userId}/activity/`, {
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  async getUserSessions(userId) {
    const response = await fetch(`${API_BASE_URL}/users/${userId}/sessions/`, {
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  async revokeUserSessions(userId) {
    const response = await fetch(`${API_BASE_URL}/users/${userId}/sessions/`, {
      method: 'POST',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  async getRoles() {
    const response = await fetch(`${API_BASE_URL}/roles/`, {
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  async getPermissions() {
    const response = await fetch(`${API_BASE_URL}/permissions/`, {
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  async updateRolePermissions(roleCode, permissions) {
    const response = await fetch(`${API_BASE_URL}/roles/${roleCode}/permissions/`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ permissions })
    });
    return handleResponse(response);
  },

  async getOrganizations() {
    const response = await fetch(`${API_BASE_URL}/organizations/`, {
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  async getDepartments() {
    const response = await fetch(`${API_BASE_URL}/departments/`, {
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  }
};
