export const BACKEND_UNREACHABLE_MESSAGE =
  'Cannot reach the backend service. Start or restart backend and verify /health is reachable.'

export const BACKEND_TIMEOUT_MESSAGE =
  'Request timed out while contacting backend. Verify backend health and try again.'

export const OLLAMA_UNAVAILABLE_MESSAGE =
  'Threat analysis provider is unavailable. Start Ollama, verify OLLAMA_HOST, and ensure the configured model is installed.'

const OLLAMA_DETAIL_PATTERNS = [
  /failed to connect to ollama/i,
  /ollama is unreachable/i,
  /ollama vision model is unreachable/i,
  /provider error from ollama/i,
  /ollama model .* unavailable/i,
  /ollama vision model .* unavailable/i,
]

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

function isOllamaProviderErrorDetail(detail) {
  if (typeof detail !== 'string') {
    return false
  }
  return OLLAMA_DETAIL_PATTERNS.some((pattern) => pattern.test(detail))
}

function formatValidationLocation(loc) {
  if (!Array.isArray(loc)) {
    return ''
  }
  return loc
    .filter((part) => part !== 'body' && part !== 'query' && part !== 'path')
    .map((part) => String(part).replace(/_/g, ' '))
    .join(' > ')
}

function getValidationDetailMessage(detail) {
  if (!Array.isArray(detail) || detail.length === 0) {
    return null
  }

  const firstError = detail[0]
  if (typeof firstError === 'string') {
    const trimmed = firstError.trim()
    return trimmed || null
  }
  if (!firstError || typeof firstError !== 'object') {
    return null
  }

  const message = typeof firstError.msg === 'string' ? firstError.msg.trim() : ''
  const location = formatValidationLocation(firstError.loc)

  if (location && message) {
    return `${location}: ${message}`
  }
  return message || null
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
    if (isOllamaProviderErrorDetail(detail.trim())) {
      category = 'provider'
      message = OLLAMA_UNAVAILABLE_MESSAGE
    } else {
      message = detail.trim()
    }
  } else if (status === 422) {
    category = 'http'
    const validationMessage = getValidationDetailMessage(detail)
    message = validationMessage || 'Request validation failed. Check the submitted values and try again.'
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
