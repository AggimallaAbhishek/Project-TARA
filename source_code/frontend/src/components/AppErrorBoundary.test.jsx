import React from 'react'
import { render, screen } from '@testing-library/react'
import AppErrorBoundary from './AppErrorBoundary'

function ThrowError() {
  throw new Error('Render failure')
}

describe('AppErrorBoundary', () => {
  let consoleErrorSpy

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    consoleErrorSpy.mockRestore()
  })

  it('renders fallback UI when child throws', () => {
    render(
      <AppErrorBoundary>
        <ThrowError />
      </AppErrorBoundary>,
    )

    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reload Page' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Go to Welcome' })).toBeInTheDocument()
  })
})
