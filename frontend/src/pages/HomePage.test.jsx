import React from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

import HomePage from './HomePage'
import {
  analyzeDocument,
  analyzeFromDiagram,
  analyzeFromUmlCode,
  analyzeSystem,
  createProject,
  extractDiagram,
  getProjects,
} from '../services/api'

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
  analyzeFromUmlCode: vi.fn(),
  analyzeDocument: vi.fn(),
  getProjects: vi.fn(),
  createProject: vi.fn(),
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
    getProjects.mockResolvedValue({
      items: [{ id: 7, name: 'Banking Mobile App' }],
      total: 1,
      skip: 0,
      limit: 100,
      has_more: false,
    })
    createProject.mockResolvedValue({ id: 8, name: 'New Project' })
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
    analyzeFromUmlCode.mockResolvedValue({ id: 404 })
    analyzeDocument.mockResolvedValue({
      analysis: { id: 303 },
      version_comparison: { has_previous_version: false },
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('submits text mode analysis', async () => {
    renderHomePage()

    await screen.findByLabelText('Project')

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
        { projectId: 7 },
      )
      expect(mockNavigate).toHaveBeenCalledWith('/analysis/101')
    })
  })

  it('extracts and analyzes diagram mode with edited text', async () => {
    renderHomePage()

    await screen.findByLabelText('Project')

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
        { projectId: 7 },
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

    await screen.findByLabelText('Project')

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

  it('shows projects unavailable state and retries project loading when backend is unreachable', async () => {
    getProjects
      .mockRejectedValueOnce({
        code: 'ERR_NETWORK',
        message: 'Network Error',
        config: { url: '/projects' },
      })
      .mockResolvedValueOnce({
        items: [{ id: 7, name: 'Banking Mobile App' }],
        total: 1,
        skip: 0,
        limit: 100,
        has_more: false,
      })

    renderHomePage()

    expect(await screen.findByDisplayValue('Projects unavailable')).toBeInTheDocument()
    expect(screen.getByText(/Cannot reach the backend service/i)).toBeInTheDocument()
    expect(screen.queryByText('Create a project first')).not.toBeInTheDocument()
    expect(screen.getByLabelText('New project name')).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Retry project load' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Retry project load' }))

    await waitFor(() => {
      expect(getProjects).toHaveBeenCalledTimes(2)
      expect(screen.getByDisplayValue('Banking Mobile App')).toBeInTheDocument()
    })

    expect(screen.queryByRole('button', { name: 'Retry project load' })).not.toBeInTheDocument()
    expect(screen.getByLabelText('New project name')).not.toBeDisabled()
  })

  it('shows create-first helper only for empty but reachable project list', async () => {
    getProjects.mockResolvedValueOnce({
      items: [],
      total: 0,
      skip: 0,
      limit: 100,
      has_more: false,
    })

    renderHomePage()

    expect(await screen.findByDisplayValue('Create a project first')).toBeInTheDocument()
    expect(screen.getByText(/Projects group related analyses/i)).toBeInTheDocument()
    expect(screen.getByLabelText('New project name')).not.toBeDisabled()
  })

  it('submits document mode analysis', async () => {
    renderHomePage()

    await screen.findByLabelText('Project')

    fireEvent.click(screen.getByRole('button', { name: 'Upload Document' }))

    fireEvent.change(screen.getByLabelText('Analysis Title'), {
      target: { value: 'Policy Document Analysis' },
    })

    const fileInput = screen.getByLabelText('Upload Document')
    const documentFile = new File(
      ['Document architecture text with gateway, auth, and data processing details.'],
      'policy.txt',
      { type: 'text/plain' },
    )
    fireEvent.change(fileInput, { target: { files: [documentFile] } })

    fireEvent.click(screen.getByRole('button', { name: 'Analyze Document Threats' }))

    await waitFor(() => {
      expect(analyzeDocument).toHaveBeenCalledWith('Policy Document Analysis', documentFile, { projectId: 7 })
      expect(mockNavigate).toHaveBeenCalledWith('/analysis/303')
    })
  })

  it('submits UML code mode analysis', async () => {
    renderHomePage()

    await screen.findByLabelText('Project')

    fireEvent.click(screen.getByRole('button', { name: 'UML Code' }))
    fireEvent.change(screen.getByLabelText('Analysis Title'), {
      target: { value: 'UML Threat Model' },
    })
    fireEvent.change(screen.getByLabelText('UML Format'), {
      target: { value: 'plantuml' },
    })
    fireEvent.change(screen.getByLabelText('UML Code'), {
      target: { value: '@startuml\nClient -> API\nAPI -> DB\n@enduml' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Analyze UML Threats' }))

    await waitFor(() => {
      expect(analyzeFromUmlCode).toHaveBeenCalledWith(
        'UML Threat Model',
        'plantuml',
        '@startuml\nClient -> API\nAPI -> DB\n@enduml',
        { projectId: 7 },
      )
      expect(mockNavigate).toHaveBeenCalledWith('/analysis/404')
    })
  })

  it('creates a project inline and uses it for analysis', async () => {
    renderHomePage()

    await screen.findByLabelText('Project')
    fireEvent.change(screen.getByLabelText('New project name'), {
      target: { value: 'Inline Project' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Create' }))

    await waitFor(() => {
      expect(createProject).toHaveBeenCalledWith({ name: 'Inline Project' })
    })

    fireEvent.change(screen.getByLabelText('Analysis Title'), {
      target: { value: 'Inline Analysis' },
    })
    fireEvent.change(screen.getByLabelText('System Architecture Description'), {
      target: { value: 'Gateway, auth service, and database with external integrations.' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Analyze System Threats' }))

    await waitFor(() => {
      expect(analyzeSystem).toHaveBeenCalledWith(
        'Inline Analysis',
        'Gateway, auth service, and database with external integrations.',
        { projectId: 8 },
      )
    })
  })
})
