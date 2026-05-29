import { BACKEND_UNREACHABLE_MESSAGE, getApiErrorMessage } from './apiError'

const axiosMockState = vi.hoisted(() => ({
  dispatch: vi.fn(),
  get: vi.fn(),
  createdInstances: [],
}))

vi.mock('../config/runtimeConfig', () => ({
  runtimeConfig: {
    apiBaseUrl: 'http://localhost:8000/api',
    debugApi: false,
    startupConfigErrors: [],
  },
}))

vi.mock('axios', () => {
  const createInstance = () => {
    const requestInterceptors = []
    const responseInterceptors = []

    const instance = {
      interceptors: {
        request: {
          use(fulfilled, rejected) {
            requestInterceptors.push({ fulfilled, rejected })
            return requestInterceptors.length - 1
          },
        },
        response: {
          use(fulfilled, rejected) {
            responseInterceptors.push({ fulfilled, rejected })
            return responseInterceptors.length - 1
          },
        },
      },
      request: vi.fn(async (config = {}) => {
        let nextConfig = { ...config }

        for (const interceptor of requestInterceptors) {
          if (typeof interceptor.fulfilled === 'function') {
            nextConfig = await interceptor.fulfilled(nextConfig)
          }
        }

        try {
          let response = await axiosMockState.dispatch(nextConfig)
          response = { ...response, config: nextConfig }
          for (const interceptor of responseInterceptors) {
            if (typeof interceptor.fulfilled === 'function') {
              response = await interceptor.fulfilled(response)
            }
          }
          return response
        } catch (dispatchError) {
          let nextError = dispatchError
          if (!nextError?.config) {
            nextError = { ...nextError, config: nextConfig }
          }
          for (const interceptor of responseInterceptors) {
            if (typeof interceptor.rejected !== 'function') {
              continue
            }
            try {
              return await interceptor.rejected(nextError)
            } catch (interceptorError) {
              nextError = interceptorError
            }
          }
          throw nextError
        }
      }),
      get: vi.fn((url, config = {}) => instance.request({ ...config, method: 'get', url })),
      post: vi.fn((url, data, config = {}) => instance.request({ ...config, method: 'post', url, data })),
      put: vi.fn((url, data, config = {}) => instance.request({ ...config, method: 'put', url, data })),
      patch: vi.fn((url, data, config = {}) => instance.request({ ...config, method: 'patch', url, data })),
      delete: vi.fn((url, config = {}) => instance.request({ ...config, method: 'delete', url })),
    }

    axiosMockState.createdInstances.push(instance)
    return instance
  }

  return {
    default: {
      create: vi.fn(() => createInstance()),
      get: axiosMockState.get,
    },
  }
})

async function loadApiModule() {
  vi.resetModules()
  axiosMockState.createdInstances.length = 0
  const module = await import('./api')
  return module
}

describe('api loopback failover', () => {
  beforeEach(() => {
    axiosMockState.dispatch.mockReset()
    axiosMockState.get.mockReset()
    axiosMockState.createdInstances.length = 0
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('retries once on loopback network failure and persists successful failover base', async () => {
    axiosMockState.dispatch
      .mockRejectedValueOnce({
        code: 'ERR_NETWORK',
        message: 'Network Error',
      })
      .mockResolvedValueOnce({
        status: 200,
        data: {
          items: [{ id: 1, name: 'Banking Mobile App' }],
          total: 1,
          skip: 0,
          limit: 20,
          has_more: false,
        },
      })

    const { __apiInternal, getProjects } = await loadApiModule()

    await expect(getProjects()).resolves.toMatchObject({
      items: [{ id: 1, name: 'Banking Mobile App' }],
    })

    expect(axiosMockState.dispatch).toHaveBeenCalledTimes(2)
    expect(axiosMockState.dispatch.mock.calls[0][0].baseURL).toBe('http://localhost:8000/api')
    expect(axiosMockState.dispatch.mock.calls[1][0].baseURL).toBe('http://127.0.0.1:8000/api')
    expect(__apiInternal.getActiveApiBaseUrl()).toBe('http://127.0.0.1:8000/api')
  })

  it('keeps backend-unreachable classification when both loopback hosts fail', async () => {
    axiosMockState.dispatch
      .mockRejectedValueOnce({
        code: 'ERR_NETWORK',
        message: 'Network Error',
      })
      .mockRejectedValueOnce({
        code: 'ERR_NETWORK',
        message: 'Network Error',
      })

    const { __apiInternal, getProjects } = await loadApiModule()

    let thrownError
    try {
      await getProjects()
    } catch (error) {
      thrownError = error
    }

    expect(axiosMockState.dispatch).toHaveBeenCalledTimes(2)
    expect(thrownError).toBeTruthy()
    expect(
      getApiErrorMessage(thrownError, {
        fallbackMessage: 'Failed to load projects',
        operation: 'projects.load',
      }),
    ).toBe(BACKEND_UNREACHABLE_MESSAGE)
    expect(__apiInternal.getActiveApiBaseUrl()).toBe('http://localhost:8000/api')
  })

  it('uses loopback failover for backend health checks and updates active base', async () => {
    axiosMockState.get
      .mockRejectedValueOnce({
        code: 'ERR_NETWORK',
        message: 'Network Error',
      })
      .mockResolvedValueOnce({
        data: { status: 'healthy' },
      })

    const { __apiInternal, getBackendHealth } = await loadApiModule()

    await expect(getBackendHealth()).resolves.toEqual({ status: 'healthy' })

    expect(axiosMockState.get).toHaveBeenCalledTimes(2)
    expect(axiosMockState.get.mock.calls[0][0]).toBe('http://localhost:8000/health')
    expect(axiosMockState.get.mock.calls[1][0]).toBe('http://127.0.0.1:8000/health')
    expect(__apiInternal.getActiveApiBaseUrl()).toBe('http://127.0.0.1:8000/api')
  })
})
