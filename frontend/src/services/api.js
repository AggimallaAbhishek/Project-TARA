import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 responses
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
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
