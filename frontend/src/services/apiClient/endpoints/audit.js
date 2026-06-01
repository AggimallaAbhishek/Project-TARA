import { api } from '../internal/client';
import { normalizePositiveInt } from '../internal/requestUtils';

function normalizeAuditPaging({ skip = 0, limit = 50, maxLimit = 200 } = {}) {
  return {
    skip: Math.max(0, normalizePositiveInt(skip, 0)),
    limit: Math.min(maxLimit, Math.max(1, normalizePositiveInt(limit, 50))),
  };
}

export async function getAuditLogs({
  action = '',
  analysis_id = '',
  project_id = '',
  skip = 0,
  limit = 50,
} = {}) {
  const params = normalizeAuditPaging({ skip, limit, maxLimit: 200 });

  if (action && action !== 'all') {
    params.action = String(action).trim();
  }
  if (analysis_id) {
    const parsedAnalysisId = normalizePositiveInt(analysis_id, 0);
    if (parsedAnalysisId > 0) {
      params.analysis_id = parsedAnalysisId;
    }
  }
  if (project_id) {
    const parsedProjectId = normalizePositiveInt(project_id, 0);
    if (parsedProjectId > 0) {
      params.project_id = parsedProjectId;
    }
  }

  const response = await api.get('/audit/logs', { params });
  return response.data;
}
