import { getLoopbackFailoverApiBaseUrl, isLoopbackHost } from '../../../config/runtimeConfigUtils';
import { LOOPBACK_NETWORK_ERROR_CODES } from './constants';

export function isLoopbackNetworkFailure(error) {
  if (error?.response) {
    return false;
  }
  if (LOOPBACK_NETWORK_ERROR_CODES.has(error?.code)) {
    return true;
  }
  return error?.code === 'ERR_NETWORK' || error?.message === 'Network Error';
}

export function isLoopbackApiBaseUrl(apiBaseUrl) {
  if (!apiBaseUrl) {
    return false;
  }
  try {
    return isLoopbackHost(new URL(apiBaseUrl, window.location.origin).hostname);
  } catch {
    return false;
  }
}

export function shouldAttemptLoopbackFailover(error, requestConfig, activeBaseUrl) {
  if (!requestConfig || requestConfig.__loopbackFailoverAttempted) {
    return false;
  }
  if (!isLoopbackNetworkFailure(error)) {
    return false;
  }
  return Boolean(getLoopbackFailoverApiBaseUrl(requestConfig.baseURL || activeBaseUrl));
}

export function getLoopbackFailoverBaseUrl(currentBaseUrl) {
  return getLoopbackFailoverApiBaseUrl(currentBaseUrl);
}

export function logLoopbackFailover(eventName, payload) {
  if (!import.meta.env.DEV) {
    return;
  }
  console.debug(eventName, payload);
}

export function resolveHealthUrl(apiBaseUrl) {
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
