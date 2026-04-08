import React from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

import HomePage from './HomePage'
import { analyzeFromDiagram, analyzeSystem, extractDiagram } from '../services/api'

const mockNavigate = vi.fn()

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

vi.mock('../services/api', () => ({
  analyzeSystem: vi.fn(),
  extractDiagram: vi.fn(),
  analyzeFromDiagram: vi.fn(),
}))

function renderHomePage() {
  return render(
    <MemoryRouter>
      <HomePage />
    </MemoryRouter>,
  )
}

describe('HomePage', () => {
  beforeEach(() => {
    analyzeSystem.mockResolvedValue({ id: 101 })
    extractDiagram.mockResolvedValue({
      extract_id: 'extract-123',
      extracted_system_description: 'Extracted architecture with gateway and database.',
      source_metadata: {
        input_type: 'mermaid',
        extractor_used: 'mermaid_parser_v1',
      },
    })
    analyzeFromDiagram.mockResolvedValue({ id: 202 })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('submits text mode analysis', async () => {
    renderHomePage()

    fireEvent.change(screen.getByLabelText('Analysis Title'), {
      target: { value: 'Text Analysis' },
    })
    fireEvent.change(screen.getByLabelText('System Architecture Description'), {
      target: { value: 'Gateway, auth service, and database with external integrations.' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Analyze System Threats' }))

    await waitFor(() => {
      expect(analyzeSystem).toHaveBeenCalledWith(
        'Text Analysis',
        'Gateway, auth service, and database with external integrations.',
      )
      expect(mockNavigate).toHaveBeenCalledWith('/analysis/101')
    })
  })

  it('extracts and analyzes diagram mode with edited text', async () => {
    renderHomePage()

    fireEvent.click(screen.getByRole('button', { name: 'Upload Diagram' }))

    fireEvent.change(screen.getByLabelText('Analysis Title'), {
      target: { value: 'Diagram Analysis' },
    })

    const fileInput = screen.getByLabelText('Upload Architecture Diagram')
    const diagramFile = new File(['graph TD\nA-->B'], 'architecture.mmd', {
      type: 'text/plain',
    })
    fireEvent.change(fileInput, { target: { files: [diagramFile] } })

    fireEvent.click(screen.getByRole('button', { name: 'Extract Architecture' }))

    await waitFor(() => {
      expect(extractDiagram).toHaveBeenCalledTimes(1)
    })

    fireEvent.change(screen.getByLabelText('Review Extracted Architecture'), {
      target: { value: 'Edited extracted architecture with gateway and identity service.' },
    })

    fireEvent.click(screen.getByRole('button', { name: 'Analyze Diagram Threats' }))

    await waitFor(() => {
      expect(analyzeFromDiagram).toHaveBeenCalledWith(
        'Diagram Analysis',
        'extract-123',
        'Edited extracted architecture with gateway and identity service.',
      )
      expect(mockNavigate).toHaveBeenCalledWith('/analysis/202')
    })
  })

  it('shows normalized backend-unreachable error when API is down', async () => {
    analyzeSystem.mockRejectedValue({
      code: 'ERR_NETWORK',
      message: 'Network Error',
      config: { url: '/analyze' },
    })

    renderHomePage()

    fireEvent.change(screen.getByLabelText('Analysis Title'), {
      target: { value: 'Network Down Case' },
    })
    fireEvent.change(screen.getByLabelText('System Architecture Description'), {
      target: { value: 'Gateway and auth service with external API.' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Analyze System Threats' }))

    expect(
      await screen.findByText(/Cannot reach the backend service/i),
    ).toBeInTheDocument()
  })
})
