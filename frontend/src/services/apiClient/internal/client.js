import axios from 'axios';
import {
  API_TIMEOUT_MS,
  CSRF_COOKIE_NAME,
  CSRF_HEADER_NAME,
  CSRF_PROTECTED_METHODS,
  DEBUG_API,
} from './constants';
import { getActiveApiBaseUrl, resetActiveApiBaseUrl, updateActiveApiBaseUrl } from './state';
import {
  getLoopbackFailoverBaseUrl,
  isLoopbackApiBaseUrl,
  isLoopbackNetworkFailure,
  logLoopbackFailover,
  resolveHealthUrl,
  shouldAttemptLoopbackFailover,
} from './failover';
import { readCookie, shouldSuppressApiErrorLog } from './requestUtils';

export const api = axios.create({
  baseURL: getActiveApiBaseUrl(),
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: API_TIMEOUT_MS,
});

// Attach CSRF token and active base URL to each request.
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
  },
);

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

    if (shouldAttemptLoopbackFailover(error, requestConfig, getActiveApiBaseUrl())) {
      const currentBaseUrl = requestConfig.baseURL || getActiveApiBaseUrl();
      const failoverBaseUrl = getLoopbackFailoverBaseUrl(currentBaseUrl);

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

    // ── 401 Unauthorized ──────────────────────────────────────────────────────
    // Fires on any non-auth endpoint so that expired JWT cookies force logout.
    // We dispatch a DOM event so AuthContext can clear its state reactively
    // instead of relying solely on the hard redirect.
    if (status === 401 && !url.includes('/auth/')) {
      window.dispatchEvent(new CustomEvent('tara:auth:expired'));
      window.location.replace('/login');
    }

    // ── 5xx Server Error ──────────────────────────────────────────────────────
    // Dispatch a global event that a banner component can subscribe to.
    if (status >= 500) {
      window.dispatchEvent(
        new CustomEvent('tara:api:server-error', {
          detail: {
            status,
            url,
            message: error.response?.data?.detail || 'An unexpected server error occurred.',
          },
        }),
      );
    }

    return Promise.reject(error);
  },
);

export async function getBackendHealth() {
  const healthUrl = resolveHealthUrl(getActiveApiBaseUrl());

  try {
    const response = await axios.get(healthUrl, {
      withCredentials: true,
      timeout: 10000,
    });
    return response.data;
  } catch (error) {
    const failoverApiBaseUrl = getLoopbackFailoverBaseUrl(getActiveApiBaseUrl());
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
}

export const __apiInternal = {
  getActiveApiBaseUrl,
  resetActiveApiBaseUrl,
};
