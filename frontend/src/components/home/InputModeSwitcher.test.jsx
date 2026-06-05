import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'

import InputModeSwitcher from './InputModeSwitcher'

describe('InputModeSwitcher', () => {
  it('renders mode cards with active state and helper text', () => {
    const onModeChange = vi.fn()

    render(<InputModeSwitcher inputMode="text" onModeChange={onModeChange} />)

    expect(screen.getByRole('button', { name: 'Text Description' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Upload File' })).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByText('Describe components, data flows, and controls.')).toBeInTheDocument()
    expect(screen.getByText('Analyze diagrams or architecture documents.')).toBeInTheDocument()
    expect(screen.getByText('Paste or attach Mermaid and PlantUML.')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Upload File' }))

    expect(onModeChange).toHaveBeenCalledWith('upload')
  })
})
