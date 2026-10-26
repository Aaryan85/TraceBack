/**
 * TraceBack API Client Service
 */

const RAW_API_BASE = import.meta.env.VITE_API_BASE_URL || '';
const API_BASE = RAW_API_BASE ? (RAW_API_BASE.endsWith('/api') ? RAW_API_BASE : `${RAW_API_BASE}/api`) : '/api';

/**
 * Standard fetch wrapper ensuring credentials (HTTP-only cookies) are included
 */
async function apiFetch(endpoint, options = {}) {
  const defaultOptions = {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    }
  };

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...defaultOptions,
    ...options,
    headers: {
      ...defaultOptions.headers,
      ...(options.headers || {})
    }
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(data.message || `Request failed with status ${response.status}`);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

// ============================================================================
// Authentication Services (Phase 2 & 3)
// ============================================================================

export async function signupUser({ name, email, password }) {
  return apiFetch('/auth/signup', {
    method: 'POST',
    body: JSON.stringify({ name, email, password })
  });
}

export async function loginUser({ email, password }) {
  return apiFetch('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  });
}

export async function logoutUser() {
  return apiFetch('/auth/logout', {
    method: 'POST'
  });
}

export async function getMe() {
  try {
    const res = await apiFetch('/auth/me');
    return res.user || null;
  } catch (err) {
    if (err.status === 401) return null;
    throw err;
  }
}

// ============================================================================
// Project Management Services (Phase 4)
// ============================================================================

export async function getProjects() {
  const res = await apiFetch('/projects');
  return res.projects || [];
}

export async function createProject({ name, description }) {
  const res = await apiFetch('/projects', {
    method: 'POST',
    body: JSON.stringify({ name, description })
  });
  return res.project;
}

export async function getProjectById(id) {
  const res = await apiFetch(`/projects/${id}`);
  return res.project;
}

export async function updateProject(id, updates) {
  const res = await apiFetch(`/projects/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(updates)
  });
  return res.project;
}

export async function deleteProject(id) {
  return apiFetch(`/projects/${id}`, {
    method: 'DELETE'
  });
}

export async function rotateProjectKey(id) {
  const res = await apiFetch(`/projects/${id}/rotate-key`, {
    method: 'POST'
  });
  return res.project;
}

// ============================================================================
// Telemetry & Dashboard Services (Scoped by Project)
// ============================================================================

export async function getHealth() {
  return apiFetch('/health');
}

export async function getOverviewAnalytics(projectId = null) {
  const query = projectId ? `?projectId=${encodeURIComponent(projectId)}` : '';
  const issueQuery = projectId ? `&projectId=${encodeURIComponent(projectId)}` : '';

  const [freqRes, issuesRes] = await Promise.all([
    apiFetch(`/analytics/error-frequency${query}`),
    apiFetch(`/issues?status=unresolved&limit=5&sort=lastSeen${issueQuery}`)
  ]);

  return {
    summary: freqRes.summary || {
      totalIssues: 0,
      unresolvedIssues: 0,
      resolvedIssues: 0,
      events24h: 0
    },
    frequency: freqRes.frequency || [],
    recentIssues: issuesRes.issues || []
  };
}

export async function getIssues({
  projectId = null,
  status = 'unresolved',
  environment,
  search,
  sort = 'lastSeen',
  page = 1,
  limit = 20
} = {}) {
  const query = new URLSearchParams();
  if (projectId) query.set('projectId', projectId);
  if (status) query.set('status', status);
  if (environment && environment !== 'all') query.set('environment', environment);
  if (search && search.trim()) query.set('search', search.trim());
  if (sort) query.set('sort', sort);
  if (page) query.set('page', String(page));
  if (limit) query.set('limit', String(limit));

  return apiFetch(`/issues?${query.toString()}`);
}

export async function getIssueById(id) {
  return apiFetch(`/issues/${id}`);
}

export async function getIssueEvents(id, { page = 1, limit = 20 } = {}) {
  const query = new URLSearchParams({ page: String(page), limit: String(limit) });
  return apiFetch(`/issues/${id}/events?${query.toString()}`);
}

export async function updateIssueStatus(id, status) {
  return apiFetch(`/issues/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status })
  });
}

export async function sendTestEvent(projectKey = 'tb_live_demo_key_9823748293') {
  const res = await fetch('/api/v1/events', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Project-Key': projectKey
    },
    body: JSON.stringify({
      type: 'TypeError',
      message: 'Cannot read properties of null (reading \'userProfile\')',
      stackTrace: `TypeError: Cannot read properties of null (reading 'userProfile')
    at getUserProfile (/app/src/controllers/userController.js:42:18)
    at Layer.handle [as handle_request] (/app/node_modules/express/lib/router/layer.js:95:5)
    at next (/app/node_modules/express/lib/router/route.js:144:13)`,
      route: 'GET /api/users/profile',
      environment: 'production',
      release: 'v1.2.4',
      service: 'demo-service',
      context: {
        userId: 'usr_84920',
        browser: 'Chrome 122',
        ip: '127.0.0.1'
      }
    })
  });

  if (!res.ok) throw new Error(`Test ingestion failed with status ${res.status}`);
  return res.json();
}
