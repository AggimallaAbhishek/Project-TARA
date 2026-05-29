import axios from 'axios';
import { runtimeConfig } from '../config/runtimeConfig';
import { getLoopbackFailoverApiBaseUrl, isLoopbackHost } from '../config/runtimeConfigUtils';

const API_BASE_URL = runtimeConfig.apiBaseUrl;
const DEBUG_API = import.meta.env.DEV && runtimeConfig.debugApi;
const DEFAULT_API_TIMEOUT_MS = 120000;
const DEFAULT_LONG_TASK_TIMEOUT_MS = 600000;
const CSRF_COOKIE_NAME = 'tara_csrf_token';
const CSRF_HEADER_NAME = 'X-CSRF-Token';
const CSRF_PROTECTED_METHODS = new Set(['post', 'put', 'patch', 'delete']);
const LOOPBACK_NETWORK_ERROR_CODES = new Set(['ERR_NETWORK', 'ECONNREFUSED']);

let activeApiBaseUrl = API_BASE_URL;

function parseTimeoutEnv(rawValue, fallbackValue) {
  const numeric = Number(rawValue);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return fallbackValue;
  }
  return Math.floor(numeric);
}

const API_TIMEOUT_MS = parseTimeoutEnv(import.meta.env.VITE_API_TIMEOUT_MS, DEFAULT_API_TIMEOUT_MS);
const LONG_TASK_TIMEOUT_MS = Math.max(
  API_TIMEOUT_MS,
  parseTimeoutEnv(import.meta.env.VITE_LONG_TASK_TIMEOUT_MS, DEFAULT_LONG_TASK_TIMEOUT_MS),
);

function normalizeRequestPath(rawUrl) {
  if (!rawUrl) {
    return '';
  }
  try {
    const parsed = new URL(rawUrl, window.location.origin);
    return parsed.pathname;
  } catch {
    return String(rawUrl).split('?')[0];
  }
}

function shouldSuppressApiErrorLog(status, rawUrl) {
  const path = normalizeRequestPath(rawUrl);
  return status === 401 && path.endsWith('/auth/me');
}

function getActiveApiBaseUrl() {
  return activeApiBaseUrl || API_BASE_URL;
}

function updateActiveApiBaseUrl(nextApiBaseUrl) {
  if (!nextApiBaseUrl || nextApiBaseUrl === activeApiBaseUrl) {
    return;
  }
  activeApiBaseUrl = nextApiBaseUrl;
}

function isLoopbackNetworkFailure(error) {
  if (error?.response) {
    return false;
  }
  if (LOOPBACK_NETWORK_ERROR_CODES.has(error?.code)) {
    return true;
  }
  return error?.code === 'ERR_NETWORK' || error?.message === 'Network Error';
}

function isLoopbackApiBaseUrl(apiBaseUrl) {
  if (!apiBaseUrl) {
    return false;
  }
  try {
    return isLoopbackHost(new URL(apiBaseUrl, window.location.origin).hostname);
  } catch {
    return false;
  }
}

function shouldAttemptLoopbackFailover(error, requestConfig) {
  if (!requestConfig || requestConfig.__loopbackFailoverAttempted) {
    return false;
  }
  if (!isLoopbackNetworkFailure(error)) {
    return false;
  }
  return Boolean(getLoopbackFailoverApiBaseUrl(requestConfig.baseURL || getActiveApiBaseUrl()));
}

function logLoopbackFailover(eventName, payload) {
  if (!import.meta.env.DEV) {
    return;
  }
  console.debug(eventName, payload);
}

function resolveHealthUrl(apiBaseUrl) {
  if (!apiBaseUrl) {
    return '/health';
  }

  try {
    const parsedUrl = new URL(apiBaseUrl, window.location.origin);
    const basePath = parsedUrl.pathname.replace(/\/+$/, '');
    if (basePath.endsWith('/api')) {
      parsedUrl.pathname = `${basePath.slice(0, -4) || ''}/health`;
    } else {
      parsedUrl.pathname = '/health';
    }
    parsedUrl.search = '';
    parsedUrl.hash = '';
    return parsedUrl.toString();
  } catch {
    return '/health';
  }
}
const ANALYSES_LIMIT_MIN = 1;
const ANALYSES_LIMIT_MAX = 100;

function normalizePositiveInt(value, fallbackValue) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return fallbackValue;
  }
  return Math.floor(numeric);
}

function readCookie(name) {
  if (typeof document === 'undefined' || !document.cookie) {
    return '';
  }

  return document.cookie
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`))
    ?.slice(name.length + 1) || '';
}

const api = axios.create({
  baseURL: getActiveApiBaseUrl(),
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: API_TIMEOUT_MS,
});

// Request interceptor for optional diagnostics
api.interceptors.request.use(
  (config) => {
    if (!config.__loopbackFailoverRetry) {
      config.baseURL = getActiveApiBaseUrl();
    }

    const method = (config.method || 'get').toLowerCase();
    const csrfToken = readCookie(CSRF_COOKIE_NAME);
    if (CSRF_PROTECTED_METHODS.has(method) && csrfToken) {
      config.headers = config.headers || {};
      config.headers[CSRF_HEADER_NAME] = decodeURIComponent(csrfToken);
    }

    if (DEBUG_API) {
      console.debug(`API Request: ${config.method?.toUpperCase()} ${config.url}`);
    }
    return config;
  },
  (error) => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Handle responses and errors
api.interceptors.response.use(
  (response) => {
    const responseBaseUrl = response?.config?.baseURL;
    if (isLoopbackApiBaseUrl(responseBaseUrl)) {
      updateActiveApiBaseUrl(responseBaseUrl);
    }

    if (DEBUG_API) {
      console.debug(`API Response: ${response.status} ${response.config.url}`);
    }
    return response;
  },
  async (error) => {
    const requestConfig = error?.config;

    if (shouldAttemptLoopbackFailover(error, requestConfig)) {
      const currentBaseUrl = requestConfig.baseURL || getActiveApiBaseUrl();
      const failoverBaseUrl = getLoopbackFailoverApiBaseUrl(currentBaseUrl);

      if (failoverBaseUrl) {
        logLoopbackFailover('api.loopback_failover.attempt', {
          from: currentBaseUrl,
          to: failoverBaseUrl,
          url: requestConfig.url || '',
          method: (requestConfig.method || 'get').toUpperCase(),
        });

        try {
          const retryResponse = await api.request({
            ...requestConfig,
            baseURL: failoverBaseUrl,
            __loopbackFailoverAttempted: true,
            __loopbackFailoverRetry: true,
          });
          updateActiveApiBaseUrl(failoverBaseUrl);
          logLoopbackFailover('api.loopback_failover.success', {
            from: currentBaseUrl,
            to: failoverBaseUrl,
            url: requestConfig.url || '',
            method: (requestConfig.method || 'get').toUpperCase(),
          });
          return retryResponse;
        } catch (retryError) {
          logLoopbackFailover('api.loopback_failover.failed', {
            from: currentBaseUrl,
            to: failoverBaseUrl,
            url: requestConfig.url || '',
            method: (requestConfig.method || 'get').toUpperCase(),
            code: retryError?.code || null,
            status: retryError?.response?.status || null,
          });
          error = retryError;
        }
      }
    }

    const status = error.response?.status;
    const url = error.config?.url || '';

    if (!shouldSuppressApiErrorLog(status, url)) {
      console.error(`API Error: ${status} ${url}`, error.response?.data);
    }
    
    // Only redirect to login on 401 if NOT already on auth endpoints
    if (status === 401 && !url.includes('/auth/')) {
      // Use replace to prevent back button issues
      window.location.replace('/login');
    }
    
    return Promise.reject(error);
  }
);

// Auth endpoints
export const googleAuth = async (credential) => {
  const response = await api.post('/auth/google', { credential });
  return response.data;
};

export const getMe = async () => {
  const response = await api.get('/auth/me');
  return response.data;
};

export const getAuthConfig = async () => {
  const response = await api.get('/auth/config');
  return response.data;
};

export const getBackendHealth = async () => {
  const healthUrl = resolveHealthUrl(getActiveApiBaseUrl());
  try {
    const response = await axios.get(healthUrl, {
      withCredentials: true,
      timeout: 10000,
    });
    return response.data;
  } catch (error) {
    const failoverApiBaseUrl = getLoopbackFailoverApiBaseUrl(getActiveApiBaseUrl());
    if (!failoverApiBaseUrl || !isLoopbackNetworkFailure(error)) {
      throw error;
    }

    const failoverHealthUrl = resolveHealthUrl(failoverApiBaseUrl);
    logLoopbackFailover('api.loopback_failover.attempt', {
      from: healthUrl,
      to: failoverHealthUrl,
      url: '/health',
      method: 'GET',
    });

    try {
      const retryResponse = await axios.get(failoverHealthUrl, {
        withCredentials: true,
        timeout: 10000,
      });
      updateActiveApiBaseUrl(failoverApiBaseUrl);
      logLoopbackFailover('api.loopback_failover.success', {
        from: healthUrl,
        to: failoverHealthUrl,
        url: '/health',
        method: 'GET',
      });
      return retryResponse.data;
    } catch (retryError) {
      logLoopbackFailover('api.loopback_failover.failed', {
        from: healthUrl,
        to: failoverHealthUrl,
        url: '/health',
        method: 'GET',
        code: retryError?.code || null,
        status: retryError?.response?.status || null,
      });
      throw retryError;
    }
  }
};

export const __apiInternal = {
  getActiveApiBaseUrl,
  resetActiveApiBaseUrl: () => {
    activeApiBaseUrl = API_BASE_URL;
  },
};

export const logoutRequest = async () => {
  const response = await api.post('/auth/logout');
  return response.data;
};

// Analysis endpoints
function appendProjectFields(payload, { projectId = null, projectName = '' } = {}) {
  if (projectId) {
    payload.project_id = Number(projectId);
  }
  if (projectName?.trim()) {
    payload.project_name = projectName.trim();
  }
  return payload;
}

export const analyzeSystem = async (title, systemDescription, projectOptions = {}) => {
  const response = await api.post('/analyze', appendProjectFields({
    title,
    system_description: systemDescription,
  }, projectOptions), {
    timeout: LONG_TASK_TIMEOUT_MS,
  });
  return response.data;
};

export const extractDiagram = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await api.post('/diagram/extract', formData, {
    timeout: LONG_TASK_TIMEOUT_MS,
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

export const analyzeFromDiagram = async (title, extractId, editedDescription = '', projectOptions = {}) => {
  const payload = appendProjectFields({
    title,
    extract_id: extractId,
  }, projectOptions);
  if (editedDescription.trim()) {
    payload.system_description = editedDescription.trim();
  }
  const response = await api.post('/diagram/analyze', payload, {
    timeout: LONG_TASK_TIMEOUT_MS,
  });
  return response.data;
};

export const analyzeDocument = async (title, file, projectOptions = {}) => {
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
};

export const getAnalyses = async ({
  skip = 0,
  limit = 20,
  q = '',
  risk_level = '',
  stride_category = '',
  date_from = '',
  date_to = '',
  project_id = '',
} = {}) => {
  const normalizedSkip = Math.max(0, normalizePositiveInt(skip, 0));
  const normalizedLimit = Math.min(
    ANALYSES_LIMIT_MAX,
    Math.max(ANALYSES_LIMIT_MIN, normalizePositiveInt(limit, 20)),
  );
  const params = { skip: normalizedSkip, limit: normalizedLimit };
  if (q.trim()) params.q = q.trim();
  if (risk_level) params.risk_level = risk_level;
  if (stride_category) params.stride_category = stride_category;
  if (date_from) params.date_from = date_from;
  if (date_to) params.date_to = date_to;
  if (project_id) params.project_id = project_id;

  const response = await api.get('/analyses', {
    params,
  });
  return response.data;
};

export const getAnalysis = async (id) => {
  const response = await api.get(`/analyses/${id}`);
  return response.data;
};

export const getAnalysisVersionComparison = async (id) => {
  const response = await api.get(`/analyses/${id}/version-comparison`);
  return response.data;
};

export const getAnalysisSummary = async (id) => {
  const response = await api.get(`/analyses/${id}/summary`);
  return response.data;
};

export const deleteAnalysis = async (id) => {
  await api.delete(`/analyses/${id}`);
};

export const compareAnalyses = async (analysisIds) => {
  const response = await api.post('/compare', {
    analysis_ids: analysisIds,
  });
  return response.data;
};

export const getProjects = async ({ skip = 0, limit = 50, q = '' } = {}) => {
  const normalizedSkip = Math.max(0, normalizePositiveInt(skip, 0));
  const normalizedLimit = Math.min(
    100,
    Math.max(1, normalizePositiveInt(limit, 50)),
  );
  const params = { skip: normalizedSkip, limit: normalizedLimit };
  if (q.trim()) params.q = q.trim();
  const response = await api.get('/projects', { params });
  return response.data;
};

export const createProject = async ({ name, description = '' }) => {
  const response = await api.post('/projects', {
    name,
    description: description || null,
  });
  return response.data;
};

export const updateProject = async (id, payload) => {
  const response = await api.patch(`/projects/${id}`, payload);
  return response.data;
};

export const getProject = async (id) => {
  const response = await api.get(`/projects/${id}`);
  return response.data;
};

export const getProjectAnalyses = async (id, { skip = 0, limit = 20 } = {}) => {
  const response = await api.get(`/projects/${id}/analyses`, {
    params: {
      skip: Math.max(0, normalizePositiveInt(skip, 0)),
      limit: Math.min(100, Math.max(1, normalizePositiveInt(limit, 20))),
    },
  });
  return response.data;
};

export const getProjectActivity = async (id, { skip = 0, limit = 50 } = {}) => {
  const response = await api.get(`/projects/${id}/activity`, {
    params: {
      skip: Math.max(0, normalizePositiveInt(skip, 0)),
      limit: Math.min(200, Math.max(1, normalizePositiveInt(limit, 50))),
    },
  });
  return response.data;
};

export const downloadAnalysisPdf = async (id) => {
  return api.get(`/analyses/${id}/export.pdf`, {
    responseType: 'blob',
  });
};

export default api;
