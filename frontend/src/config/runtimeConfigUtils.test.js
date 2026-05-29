import {
  getLoopbackFailoverApiBaseUrl,
  normalizeLoopbackApiBaseUrl,
} from './runtimeConfigUtils'

describe('normalizeLoopbackApiBaseUrl', () => {
  it('normalizes loopback hostname mismatch to frontend hostname', () => {
    const normalized = normalizeLoopbackApiBaseUrl(
      'http://127.0.0.1:8000/api',
      'localhost',
    )
    expect(normalized).toBe('http://localhost:8000/api')
  })

  it('keeps api base url unchanged when hostnames already match', () => {
    const normalized = normalizeLoopbackApiBaseUrl(
      'http://localhost:8000/api',
      'localhost',
    )
    expect(normalized).toBe('http://localhost:8000/api')
  })

  it('keeps non-loopback domains unchanged', () => {
    const normalized = normalizeLoopbackApiBaseUrl(
      'https://api.example.com/v1',
      'localhost',
    )
    expect(normalized).toBe('https://api.example.com/v1')
  })
})

describe('getLoopbackFailoverApiBaseUrl', () => {
  it('returns 127.0.0.1 failover candidate for localhost', () => {
    expect(getLoopbackFailoverApiBaseUrl('http://localhost:8000/api')).toBe('http://127.0.0.1:8000/api')
  })

  it('returns localhost failover candidate for 127.0.0.1', () => {
    expect(getLoopbackFailoverApiBaseUrl('http://127.0.0.1:8000/api')).toBe('http://localhost:8000/api')
  })

  it('returns null for non-loopback hostnames', () => {
    expect(getLoopbackFailoverApiBaseUrl('https://api.example.com/v1')).toBeNull()
  })
})
