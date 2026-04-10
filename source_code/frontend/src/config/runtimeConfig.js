import { normalizeLoopbackApiBaseUrl } from './runtimeConfigUtils'

const rawApiBaseUrl = (import.meta.env.VITE_API_BASE_URL || "").trim()
const envGoogleClientId = (import.meta.env.VITE_GOOGLE_CLIENT_ID || "").trim()
const debugApi = import.meta.env.VITE_DEBUG_API === "true"
const frontendHostname = globalThis.location?.hostname || ""

const apiBaseUrl = normalizeLoopbackApiBaseUrl(rawApiBaseUrl, frontendHostname)

const startupConfigErrors = []
if (!apiBaseUrl) {
  startupConfigErrors.push("Missing VITE_API_BASE_URL in frontend/.env")
}

if (import.meta.env.DEV && rawApiBaseUrl !== apiBaseUrl) {
  console.warn(
    `Normalized VITE_API_BASE_URL host to match frontend origin for cookie compatibility: ${apiBaseUrl}`,
  )
}

export const runtimeConfig = {
  apiBaseUrl,
  envGoogleClientId,
  debugApi,
  startupConfigErrors,
}
