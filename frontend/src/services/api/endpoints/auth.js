import { api } from '../internal/client';

export async function googleAuth(credential) {
  const response = await api.post('/auth/google', { credential });
  return response.data;
}

export async function getMe() {
  const response = await api.get('/auth/me');
  return response.data;
}

export async function getAuthConfig() {
  const response = await api.get('/auth/config');
  return response.data;
}

export async function logoutRequest() {
  const response = await api.post('/auth/logout');
  return response.data;
}
