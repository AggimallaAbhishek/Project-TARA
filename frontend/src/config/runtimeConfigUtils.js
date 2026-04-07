const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1'])

function isLoopbackHost(hostname) {
  return LOOPBACK_HOSTS.has(hostname)
}

export function normalizeLoopbackApiBaseUrl(apiBaseUrl, frontendHostname) {
  if (!apiBaseUrl) {
    return apiBaseUrl
  }

  try {
    const parsedApiUrl = new URL(apiBaseUrl)
    if (
      isLoopbackHost(frontendHostname) &&
      isLoopbackHost(parsedApiUrl.hostname) &&
      frontendHostname !== parsedApiUrl.hostname
    ) {
      const normalizedUrl = new URL(apiBaseUrl)
      normalizedUrl.hostname = frontendHostname
      return normalizedUrl.toString().replace(/\/$/, '')
    }
    return apiBaseUrl
  } catch {
    return apiBaseUrl
  }
}
