import React from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

import LoginPage from './LoginPage'
import { getBackendHealth } from '../services/api'

const mockNavigate = vi.fn()
const mockLogin = vi.fn()

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

vi.mock('@react-oauth/google', () => ({
  GoogleLogin: ({ onSuccess }) => (
    <button
      type="button"
      onClick={() => onSuccess({ credential: 'credential-token' })}
    >
      Google Login Button
    </button>
  ),
}))

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    login: mockLogin,
    isAuthenticated: false,
    loading: false,
  }),
}))

vi.mock('../services/api', () => ({
  getBackendHealth: vi.fn(),
}))

function renderLoginPage() {
  return render(
    <MemoryRouter>
      <LoginPage isGoogleConfigured googleConfigSource="frontend-env" />
    </MemoryRouter>,
  )
}

describe('LoginPage backend reachability', () => {
  beforeEach(() => {
    mockLogin.mockResolvedValue({ user: { id: 1 } })
    mockNavigate.mockReset()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('shows backend guidance and disables Google sign-in when backend is unreachable', async () => {
    getBackendHealth.mockRejectedValue({
      code: 'ERR_NETWORK',
      message: 'Network Error',
      config: { url: '/health' },
    })

    renderLoginPage()

    expect(
      await screen.findByText(/Cannot reach the backend service/i),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Google Login Button' }),
    ).not.toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Retry Backend Check' }),
    ).toBeInTheDocument()
  })

  it('renders Google sign-in when backend is reachable', async () => {
    getBackendHealth.mockResolvedValue({ status: 'healthy' })

    renderLoginPage()

    await waitFor(() => {
      expect(getBackendHealth).toHaveBeenCalledTimes(1)
    })

    fireEvent.click(screen.getByRole('button', { name: 'Google Login Button' }))

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('credential-token')
      expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true })
    })
  })
})
