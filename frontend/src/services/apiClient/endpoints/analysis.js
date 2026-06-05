import { LONG_TASK_TIMEOUT_MS } from '../internal/constants';
import { api } from '../internal/client';
import {
  appendProjectFields,
  normalizeAnalysesPaging,
  normalizePositiveInt,
} from '../internal/requestUtils';

export async function analyzeSystem(title, systemDescription, projectOptions = {}) {
  const response = await api.post(
    '/analyze',
    appendProjectFields(
      {
        title,
        system_description: systemDescription,
      },
      projectOptions,
    ),
    {
      timeout: LONG_TASK_TIMEOUT_MS,
    },
  );

  return response.data;
}

export async function analyzeSystemJob(title, systemDescription, projectOptions = {}) {
  const response = await api.post(
    '/analyze/jobs',
    appendProjectFields(
      {
        title,
        system_description: systemDescription,
      },
      projectOptions,
    ),
    {
      timeout: LONG_TASK_TIMEOUT_MS,
    },
  );

  return response.data;
}

export async function extractDiagram(file) {
  const formData = new FormData();
  formData.append('file', file);

  const response = await api.post('/diagram/extract', formData, {
    timeout: LONG_TASK_TIMEOUT_MS,
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  return response.data;
}

export async function analyzeFromDiagram(title, extractId, editedDescription = '', projectOptions = {}) {
  const payload = appendProjectFields(
    {
      title,
      extract_id: extractId,
    },
    projectOptions,
  );

  if (editedDescription.trim()) {
    payload.system_description = editedDescription.trim();
  }

  const response = await api.post('/diagram/analyze', payload, {
    timeout: LONG_TASK_TIMEOUT_MS,
  });

  return response.data;
}

export async function analyzeFromDiagramJob(title, extractId, editedDescription = '', projectOptions = {}) {
  const payload = appendProjectFields(
    {
      title,
      extract_id: extractId,
    },
    projectOptions,
  );

  if (editedDescription.trim()) {
    payload.system_description = editedDescription.trim();
  }

  const response = await api.post('/diagram/analyze/jobs', payload, {
    timeout: LONG_TASK_TIMEOUT_MS,
  });

  return response.data;
}

export async function analyzeFromUmlCode(title, umlFormat, umlCode, projectOptions = {}) {
  const response = await api.post(
    '/diagram/analyze-code',
    appendProjectFields(
      {
        title,
        uml_format: umlFormat,
        uml_code: umlCode,
      },
      projectOptions,
    ),
    {
      timeout: LONG_TASK_TIMEOUT_MS,
    },
  );

  return response.data;
}

export async function analyzeFromUmlCodeJob(title, umlFormat, umlCode, projectOptions = {}) {
  const response = await api.post(
    '/diagram/analyze-code/jobs',
    appendProjectFields(
      {
        title,
        uml_format: umlFormat,
        uml_code: umlCode,
      },
      projectOptions,
    ),
    {
      timeout: LONG_TASK_TIMEOUT_MS,
    },
  );

  return response.data;
}

export async function analyzeDocument(title, file, projectOptions = {}) {
  const formData = new FormData();
  formData.append('title', title);
  if (projectOptions.projectId) {
    formData.append('project_id', String(projectOptions.projectId));
  }
  if (projectOptions.projectName?.trim()) {
    formData.append('project_name', projectOptions.projectName.trim());
  }
  formData.append('file', file);

  const response = await api.post('/document/analyze', formData, {
    timeout: LONG_TASK_TIMEOUT_MS,
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  return response.data;
}

export async function analyzeDocumentJob(title, file, projectOptions = {}) {
  const formData = new FormData();
  formData.append('title', title);
  if (projectOptions.projectId) {
    formData.append('project_id', String(projectOptions.projectId));
  }
  if (projectOptions.projectName?.trim()) {
    formData.append('project_name', projectOptions.projectName.trim());
  }
  formData.append('file', file);

  const response = await api.post('/document/analyze/jobs', formData, {
    timeout: LONG_TASK_TIMEOUT_MS,
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  return response.data;
}

export async function getAnalysisJob(jobId) {
  const response = await api.get(`/analysis-jobs/${jobId}`);
  return response.data;
}

export async function getModelReadiness() {
  const response = await api.get('/model-readiness');
  return response.data;
}

export async function getAnalyses({
  skip = 0,
  limit = 20,
  q = '',
  risk_level = '',
  stride_category = '',
  date_from = '',
  date_to = '',
  project_id = '',
} = {}) {
  const paging = normalizeAnalysesPaging({ skip, limit });
  const params = { ...paging };

  if (q.trim()) params.q = q.trim();
  if (risk_level) params.risk_level = risk_level;
  if (stride_category) params.stride_category = stride_category;
  if (date_from) params.date_from = date_from;
  if (date_to) params.date_to = date_to;
  if (project_id) params.project_id = project_id;

  const response = await api.get('/analyses', { params });
  return response.data;
}

export async function getAnalysis(id) {
  const response = await api.get(`/analyses/${id}`);
  return response.data;
}

export async function getAnalysisDiagramSvg(id, { refresh = false } = {}) {
  const response = await api.get(`/analyses/${id}/diagram.svg`, {
    params: refresh ? { refresh: true } : undefined,
    responseType: 'text',
    headers: {
      Accept: 'image/svg+xml',
    },
  });
  return response.data;
}

export async function downloadAnalysisDiagramPng(id, { refresh = false } = {}) {
  return api.get(`/analyses/${id}/diagram.png`, {
    params: refresh ? { refresh: true } : undefined,
    responseType: 'blob',
    headers: {
      Accept: 'image/png',
    },
  });
}

export async function getAnalysisVersionComparison(id) {
  const response = await api.get(`/analyses/${id}/version-comparison`);
  return response.data;
}

export async function getAnalysisSummary(id) {
  const response = await api.get(`/analyses/${id}/summary`);
  return response.data;
}

export async function deleteAnalysis(id) {
  await api.delete(`/analyses/${id}`);
}

export async function compareAnalyses(analysisIds) {
  const response = await api.post('/compare', {
    analysis_ids: analysisIds,
  });
  return response.data;
}

export async function downloadAnalysisPdf(id) {
  return api.get(`/analyses/${id}/export.pdf`, {
    responseType: 'blob',
  });
}

export function normalizeProjectPaging({ skip = 0, limit = 50, maxLimit = 100 } = {}) {
  return {
    skip: Math.max(0, normalizePositiveInt(skip, 0)),
    limit: Math.min(maxLimit, Math.max(1, normalizePositiveInt(limit, 50))),
  };
}
