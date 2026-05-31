import { api } from '../internal/client';
import { normalizePositiveInt } from '../internal/requestUtils';

function normalizePaging({ skip = 0, limit = 50, maxLimit = 100 } = {}) {
  return {
    skip: Math.max(0, normalizePositiveInt(skip, 0)),
    limit: Math.min(maxLimit, Math.max(1, normalizePositiveInt(limit, 50))),
  };
}

export async function getProjects({ skip = 0, limit = 50, q = '' } = {}) {
  const params = normalizePaging({ skip, limit, maxLimit: 100 });
  if (q.trim()) params.q = q.trim();

  const response = await api.get('/projects', { params });
  return response.data;
}

export async function createProject({ name, description = '' }) {
  const response = await api.post('/projects', {
    name,
    description: description || null,
  });
  return response.data;
}

export async function updateProject(id, payload) {
  const response = await api.patch(`/projects/${id}`, payload);
  return response.data;
}

export async function getProject(id) {
  const response = await api.get(`/projects/${id}`);
  return response.data;
}

export async function getProjectAnalyses(id, { skip = 0, limit = 20 } = {}) {
  const params = normalizePaging({ skip, limit, maxLimit: 100 });
  const response = await api.get(`/projects/${id}/analyses`, { params });
  return response.data;
}

export async function getProjectActivity(id, { skip = 0, limit = 50 } = {}) {
  const params = normalizePaging({ skip, limit, maxLimit: 200 });
  const response = await api.get(`/projects/${id}/activity`, { params });
  return response.data;
}
