export async function resolveGoogleClientId(envGoogleClientId, loadAuthConfig) {
  if (envGoogleClientId) {
    return envGoogleClientId
  }

  try {
    const config = await loadAuthConfig()
    return (config?.google_client_id || "").trim()
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error("Failed to load auth configuration:", error)
    }
    return ""
  }
}
