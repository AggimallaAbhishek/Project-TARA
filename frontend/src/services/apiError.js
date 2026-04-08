export const BACKEND_UNREACHABLE_MESSAGE =
  'Cannot reach the backend service. Start or restart backend and verify /health is reachable.'

export const BACKEND_TIMEOUT_MESSAGE =
  'Request timed out while contacting backend. Verify backend health and try again.'

export function isBackendUnavailableError(error) {
  if (error?.response) {
    return false
  }
  return (
    error?.code === 'ERR_NETWORK'
    || error?.code === 'ECONNABORTED'
    || error?.message === 'Network Error'
  )
}

export function normalizeApiError(
  error,
  { fallbackMessage = 'Request failed. Please try again.', operation = 'request' } = {},
) {
  const status = error?.response?.status ?? null
  const detail = error?.response?.data?.detail
  const code = error?.code ?? null
  const url = error?.config?.url ?? null

  let category = 'unknown'
  let message = fallbackMessage

  if (typeof detail === 'string' && detail.trim()) {
    category = 'http'
    message = detail.trim()
  } else if (isBackendUnavailableError(error)) {
    if (code === 'ECONNABORTED') {
      category = 'timeout'
      message = BACKEND_TIMEOUT_MESSAGE
    } else {
      category = 'network'
      message = BACKEND_UNREACHABLE_MESSAGE
    }
  } else if (status !== null) {
    category = 'http'
    if (status >= 500) {
      message = 'Backend service error. Check backend logs and try again.'
    } else if (status === 429) {
      message = 'Too many requests. Please wait and try again.'
    }
  }

  const normalized = {
    category,
    message,
    status,
    code,
    url,
  }

  if (import.meta.env.DEV) {
    console.debug('api_error_normalized', {
      operation,
      ...normalized,
    })
  }

  return normalized
}

export function getApiErrorMessage(error, options = {}) {
  return normalizeApiError(error, options).message
}
