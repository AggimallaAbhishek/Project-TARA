import { resolveGoogleClientId } from './authConfig'

describe('resolveGoogleClientId', () => {
  it('uses frontend env client id when provided', async () => {
    const loader = vi.fn().mockResolvedValue({ google_client_id: 'backend-id' })
    const clientId = await resolveGoogleClientId('frontend-id', loader)
    expect(clientId).toBe('frontend-id')
    expect(loader).not.toHaveBeenCalled()
  })

  it('falls back to backend config when frontend env is missing', async () => {
    const loader = vi.fn().mockResolvedValue({ google_client_id: 'backend-id' })
    const clientId = await resolveGoogleClientId('', loader)
    expect(clientId).toBe('backend-id')
    expect(loader).toHaveBeenCalledTimes(1)
  })

  it('returns empty string when backend config load fails', async () => {
    const loader = vi.fn().mockRejectedValue(new Error('network error'))
    const clientId = await resolveGoogleClientId('', loader)
    expect(clientId).toBe('')
    expect(loader).toHaveBeenCalledTimes(1)
  })
})
