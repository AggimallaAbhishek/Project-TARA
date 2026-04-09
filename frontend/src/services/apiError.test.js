import {
  BACKEND_TIMEOUT_MESSAGE,
  BACKEND_UNREACHABLE_MESSAGE,
  getApiErrorMessage,
  OLLAMA_UNAVAILABLE_MESSAGE,
  normalizeApiError,
} from './apiError'

describe('apiError utilities', () => {
  it('maps network errors to backend-unreachable guidance', () => {
    const error = {
      code: 'ERR_NETWORK',
      message: 'Network Error',
      config: { url: '/auth/google' },
    }

    const normalized = normalizeApiError(error, {
      fallbackMessage: 'Fallback message',
      operation: 'auth.login',
    })

    expect(normalized.category).toBe('network')
    expect(normalized.message).toBe(BACKEND_UNREACHABLE_MESSAGE)
  })

  it('preserves backend detail when provided', () => {
    const message = getApiErrorMessage(
      {
        response: {
          status: 400,
          data: {
            detail: 'Invalid Google token',
          },
        },
      },
      {
        fallbackMessage: 'Fallback message',
      },
    )

    expect(message).toBe('Invalid Google token')
  })

  it('maps timeout errors to timeout guidance', () => {
    const message = getApiErrorMessage(
      {
        code: 'ECONNABORTED',
        config: {
          url: '/analyses',
        },
      },
      {
        fallbackMessage: 'Fallback message',
      },
    )

    expect(message).toBe(BACKEND_TIMEOUT_MESSAGE)
  })

  it('normalizes Ollama provider details to actionable guidance', () => {
    const message = getApiErrorMessage(
      {
        response: {
          status: 502,
          data: {
            detail: 'Analysis failed: Ollama is unreachable. Start Ollama and verify OLLAMA_HOST is reachable from the backend runtime.',
          },
        },
      },
      {
        fallbackMessage: 'Fallback message',
      },
    )

    expect(message).toBe(OLLAMA_UNAVAILABLE_MESSAGE)
  })

  it('parses FastAPI validation detail arrays into actionable messages', () => {
    const message = getApiErrorMessage(
      {
        response: {
          status: 422,
          data: {
            detail: [
              {
                loc: ['query', 'limit'],
                msg: 'Input should be less than or equal to 100',
              },
            ],
          },
        },
      },
      {
        fallbackMessage: 'Fallback message',
      },
    )

    expect(message).toBe('limit: Input should be less than or equal to 100')
  })
})
