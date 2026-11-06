const API_BASE = '/api';

function getToken() {
  return localStorage.getItem('penny_token') || '';
}

async function request(endpoint, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...(options.headers || {})
  };

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers
  });

  let data = null;
  try {
    data = await res.json();
  } catch {
    // If not json
  }

  if (!res.ok) {
    const errorMsg = data?.error || `Request failed with status ${res.status}`;
    const err = new Error(errorMsg);
    err.status = res.status;
    err.data = data;
    throw err;
  }

  return data;
}

export const api = {
  auth: {
    login: (email, password) => request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
    register: (email, password, name) => request('/auth/register', { method: 'POST', body: JSON.stringify({ email, password, name }) }),
    getMe: () => request('/auth/me')
  },
  gmail: {
    getStatus: () => request('/gmail/status'),
    getAuthUrl: () => request('/gmail/auth-url'),
    sendCallbackCode: (code) => request('/gmail/callback', { method: 'POST', body: JSON.stringify({ code }) }),
    saveConfig: (config) => request('/gmail/config', { method: 'POST', body: JSON.stringify(config) }),
    sync: () => request('/gmail/sync', { method: 'POST' }),
    mockSync: () => request('/gmail/mock-sync', { method: 'POST' }),
    disconnect: () => request('/gmail/disconnect', { method: 'POST' }),
    deleteData: (sourceOnly) => request('/gmail/delete-data', { method: 'POST', body: JSON.stringify({ sourceOnly }) })
  },
  transactions: {
    list: (params = {}) => {
      const q = new URLSearchParams();
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') {
          q.append(k, v);
        }
      });
      const qs = q.toString() ? `?${q.toString()}` : '';
      return request(`/transactions${qs}`);
    },
    create: (txData) => request('/transactions', { method: 'POST', body: JSON.stringify(txData) }),
    update: (id, updates) => request(`/transactions/${id}`, { method: 'PUT', body: JSON.stringify(updates) }),
    delete: (id) => request(`/transactions/${id}`, { method: 'DELETE' }),
    approve: (id) => request(`/transactions/${id}/approve`, { method: 'POST' }),
    clearAll: () => request('/transactions/clear-all', { method: 'POST' })
  },
  reports: {
    get: () => request('/reports')
  },
  goals: {
    get: () => request('/budget-goals'),
    save: (goalData) => request('/budget-goals', { method: 'POST', body: JSON.stringify(goalData) })
  }
};
