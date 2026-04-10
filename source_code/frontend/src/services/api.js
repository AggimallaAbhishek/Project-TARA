import axios from 'axios';
import { runtimeConfig } from '../config/runtimeConfig';

const API_BASE_URL = runtimeConfig.apiBaseUrl;
const DEBUG_API = import.meta.env.DEV && runtimeConfig.debugApi;
const DEFAULT_API_TIMEOUT_MS = 120000;
const DEFAULT_LONG_TASK_TIMEOUT_MS = 600000;

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

const BACKEND_HEALTH_URL = resolveHealthUrl(API_BASE_URL);
const ANALYSES_LIMIT_MIN = 1;
const ANALYSES_LIMIT_MAX = 100;

function normalizePositiveInt(value, fallbackValue) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return fallbackValue;
  }
  return Math.floor(numeric);
}

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: API_TIMEOUT_MS,
});

// Request interceptor for optional diagnostics
api.interceptors.request.use(
  (config) => {
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
    if (DEBUG_API) {
      console.debug(`API Response: ${response.status} ${response.config.url}`);
    }
    return response;
  },
  (error) => {
    const status = error.response?.status;
    const url = error.config?.url || '';
    
    console.error(`API Error: ${status} ${url}`, error.response?.data);
    
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
  const response = await axios.get(BACKEND_HEALTH_URL, {
    withCredentials: true,
    timeout: 10000,
  });
  return response.data;
};

export const logoutRequest = async () => {
  const response = await api.post('/auth/logout');
  return response.data;
};

// Analysis endpoints
export const analyzeSystem = async (title, systemDescription) => {
  const response = await api.post('/analyze', {
    title,
    system_description: systemDescription,
  }, {
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

export const analyzeFromDiagram = async (title, extractId, editedDescription = '') => {
  const payload = {
    title,
    extract_id: extractId,
  };
  if (editedDescription.trim()) {
    payload.system_description = editedDescription.trim();
  }
  const response = await api.post('/diagram/analyze', payload, {
    timeout: LONG_TASK_TIMEOUT_MS,
  });
  return response.data;
};

export const analyzeDocument = async (title, file) => {
  const formData = new FormData();
  formData.append('title', title);
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

export const downloadAnalysisPdf = async (id) => {
  return api.get(`/analyses/${id}/export.pdf`, {
    responseType: 'blob',
  });
};

export default api;
