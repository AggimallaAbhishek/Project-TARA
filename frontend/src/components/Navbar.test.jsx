import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

import Navbar from './Navbar'

const mockUseAuth = vi.fn()

vi.mock('../context/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}))

function renderNavbar() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <Navbar />
    </MemoryRouter>,
  )
}

describe('Navbar', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('falls back to user initials when avatar image fails to load', () => {
    mockUseAuth.mockReturnValue({
      user: {
        name: 'Aggimalla Abhishek',
        picture: 'https://broken.example/avatar.png',
      },
      logout: vi.fn(),
      isAuthenticated: true,
    })

    renderNavbar()

    const image = screen.getByTestId('navbar-avatar-image')
    fireEvent.error(image)

    expect(screen.queryByTestId('navbar-avatar-image')).not.toBeInTheDocument()
    expect(screen.getByTestId('navbar-avatar-fallback')).toBeInTheDocument()
    expect(screen.getByText('A')).toBeInTheDocument()
  })

  it('uses fallback avatar when picture is missing', () => {
    mockUseAuth.mockReturnValue({
      user: {
        name: 'User Without Picture',
      },
      logout: vi.fn(),
      isAuthenticated: true,
    })

    renderNavbar()

    expect(screen.getByTestId('navbar-avatar-fallback')).toBeInTheDocument()
    expect(screen.getByText('U')).toBeInTheDocument()
  })
})
