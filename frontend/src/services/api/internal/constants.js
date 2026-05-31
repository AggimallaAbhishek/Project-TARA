import { runtimeConfig } from '../../../config/runtimeConfig';

const DEFAULT_API_TIMEOUT_MS = 120000;
const DEFAULT_LONG_TASK_TIMEOUT_MS = 600000;

function parseTimeoutEnv(rawValue, fallbackValue) {
  const numeric = Number(rawValue);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return fallbackValue;
  }
  return Math.floor(numeric);
}

export const API_BASE_URL = runtimeConfig.apiBaseUrl;
export const DEBUG_API = import.meta.env.DEV && runtimeConfig.debugApi;
export const API_TIMEOUT_MS = parseTimeoutEnv(import.meta.env.VITE_API_TIMEOUT_MS, DEFAULT_API_TIMEOUT_MS);
export const LONG_TASK_TIMEOUT_MS = Math.max(
  API_TIMEOUT_MS,
  parseTimeoutEnv(import.meta.env.VITE_LONG_TASK_TIMEOUT_MS, DEFAULT_LONG_TASK_TIMEOUT_MS),
);

export const CSRF_COOKIE_NAME = 'tara_csrf_token';
export const CSRF_HEADER_NAME = 'X-CSRF-Token';
export const CSRF_PROTECTED_METHODS = new Set(['post', 'put', 'patch', 'delete']);
export const LOOPBACK_NETWORK_ERROR_CODES = new Set(['ERR_NETWORK', 'ECONNREFUSED']);
export const FRONTEND_HOSTNAME = globalThis.location?.hostname || '';

export const ANALYSES_LIMIT_MIN = 1;
export const ANALYSES_LIMIT_MAX = 100;
