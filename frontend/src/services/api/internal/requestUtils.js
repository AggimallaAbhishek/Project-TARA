import { ANALYSES_LIMIT_MAX, ANALYSES_LIMIT_MIN } from './constants';

export function normalizeRequestPath(rawUrl) {
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

export function shouldSuppressApiErrorLog(status, rawUrl) {
  const path = normalizeRequestPath(rawUrl);
  return status === 401 && path.endsWith('/auth/me');
}

export function normalizePositiveInt(value, fallbackValue) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return fallbackValue;
  }
  return Math.floor(numeric);
}

export function normalizeAnalysesPaging({ skip = 0, limit = 20 } = {}) {
  const normalizedSkip = Math.max(0, normalizePositiveInt(skip, 0));
  const normalizedLimit = Math.min(
    ANALYSES_LIMIT_MAX,
    Math.max(ANALYSES_LIMIT_MIN, normalizePositiveInt(limit, 20)),
  );

  return { skip: normalizedSkip, limit: normalizedLimit };
}

export function readCookie(name) {
  if (typeof document === 'undefined' || !document.cookie) {
    return '';
  }

  return document.cookie
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`))
    ?.slice(name.length + 1) || '';
}

export function appendProjectFields(payload, { projectId = null, projectName = '' } = {}) {
  if (projectId) {
    payload.project_id = Number(projectId);
  }
  if (projectName?.trim()) {
    payload.project_name = projectName.trim();
  }
  return payload;
}
