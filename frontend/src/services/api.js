import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';
const DEBUG_API = import.meta.env.DEV && import.meta.env.VITE_DEBUG_API === 'true';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 120000, // 2 minutes for LLM analysis
});

// Add auth token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
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
      localStorage.removeItem('token');
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

// Analysis endpoints
export const analyzeSystem = async (title, systemDescription) => {
  const response = await api.post('/analyze', {
    title,
    system_description: systemDescription,
  });
  return response.data;
};

export const getAnalyses = async (skip = 0, limit = 20) => {
  const response = await api.get('/analyses', {
    params: { skip, limit },
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

export default api;
