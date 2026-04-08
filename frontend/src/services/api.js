import axios from 'axios';
import { runtimeConfig } from '../config/runtimeConfig';

const API_BASE_URL = runtimeConfig.apiBaseUrl;
const DEBUG_API = import.meta.env.DEV && runtimeConfig.debugApi;

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 120000, // 2 minutes for LLM analysis
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
    
    // Auto-logout on 401 for non-auth endpoints (token expired mid-session)
    if (status === 401 && !url.includes('/auth/')) {
      window.location.href = '/login';
      return Promise.reject(error);
    }

    // Only log non-401 errors or 401s on auth endpoints to avoid noise
    if (status !== 401 || url.includes('/auth/')) {
      console.error(`API Error: ${status} ${url}`, error.response?.data);
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

export const logoutRequest = async () => {
  const response = await api.post('/auth/logout');
  return response.data;
};

// Analysis endpoints
export const analyzeSystem = async (title, systemDescription) => {
  const response = await api.post('/analyze', {
    title,
    system_description: systemDescription,
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
  const params = { skip, limit };
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

export const getAnalysisSummary = async (id) => {
  const response = await api.get(`/analyses/${id}/summary`);
  return response.data;
};

export const deleteAnalysis = async (id) => {
  await api.delete(`/analyses/${id}`);
};

export const downloadAnalysisPdf = async (id) => {
  return api.get(`/analyses/${id}/export.pdf`, {
    responseType: 'blob',
  });
};

export const compareAnalyses = async (analysisIds) => {
  const response = await api.post('/compare', { analysis_ids: analysisIds });
  return response.data;
};

export default api;
