const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || "").trim()
const envGoogleClientId = (import.meta.env.VITE_GOOGLE_CLIENT_ID || "").trim()
const debugApi = import.meta.env.VITE_DEBUG_API === "true"

const startupConfigErrors = []
if (!apiBaseUrl) {
  startupConfigErrors.push("Missing VITE_API_BASE_URL in frontend/.env")
}

export const runtimeConfig = {
  apiBaseUrl,
  envGoogleClientId,
  debugApi,
  startupConfigErrors,
}
