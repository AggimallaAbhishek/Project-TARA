import {
  clearGoogleLoginCallbacks,
  dispatchGoogleLoginError,
  dispatchGoogleLoginSuccess,
  registerGoogleLoginCallbacks,
} from './googleLoginCallbacks'

describe('googleLoginCallbacks', () => {
  afterEach(() => {
    clearGoogleLoginCallbacks()
    vi.restoreAllMocks()
  })

  it('dispatches success to the currently registered callback', async () => {
    const onSuccess = vi.fn()

    registerGoogleLoginCallbacks({ onSuccess })
    await dispatchGoogleLoginSuccess({ credential: 'token-123' })

    expect(onSuccess).toHaveBeenCalledWith({ credential: 'token-123' })
  })

  it('dispatches error to the currently registered callback', () => {
    const onError = vi.fn()

    registerGoogleLoginCallbacks({ onError })
    dispatchGoogleLoginError()

    expect(onError).toHaveBeenCalledTimes(1)
  })

  it('replaces callbacks on re-registration and clears them on teardown', async () => {
    const firstSuccess = vi.fn()
    const secondSuccess = vi.fn()

    registerGoogleLoginCallbacks({ onSuccess: firstSuccess })
    registerGoogleLoginCallbacks({ onSuccess: secondSuccess })
    await dispatchGoogleLoginSuccess({ credential: 'latest' })
    clearGoogleLoginCallbacks()
    await dispatchGoogleLoginSuccess({ credential: 'ignored' })

    expect(firstSuccess).not.toHaveBeenCalled()
    expect(secondSuccess).toHaveBeenCalledTimes(1)
    expect(secondSuccess).toHaveBeenCalledWith({ credential: 'latest' })
  })
})
