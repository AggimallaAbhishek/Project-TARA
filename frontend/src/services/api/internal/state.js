import { isLoopbackHost } from '../../../config/runtimeConfigUtils';
import { API_BASE_URL, FRONTEND_HOSTNAME } from './constants';

let activeApiBaseUrl = API_BASE_URL;

function canPersistLoopbackApiBaseUrl(apiBaseUrl) {
  if (!apiBaseUrl) {
    return false;
  }

  try {
    const parsedApiUrl = new URL(apiBaseUrl, window.location.origin);
    if (
      isLoopbackHost(FRONTEND_HOSTNAME)
      && isLoopbackHost(parsedApiUrl.hostname)
      && parsedApiUrl.hostname !== FRONTEND_HOSTNAME
    ) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export function getActiveApiBaseUrl() {
  return activeApiBaseUrl || API_BASE_URL;
}

export function updateActiveApiBaseUrl(nextApiBaseUrl) {
  if (!nextApiBaseUrl || nextApiBaseUrl === activeApiBaseUrl) {
    return;
  }
  if (!canPersistLoopbackApiBaseUrl(nextApiBaseUrl)) {
    return;
  }
  activeApiBaseUrl = nextApiBaseUrl;
}

export function resetActiveApiBaseUrl() {
  activeApiBaseUrl = API_BASE_URL;
}
