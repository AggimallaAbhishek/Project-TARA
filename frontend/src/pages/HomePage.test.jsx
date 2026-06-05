import React from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

import HomePage from './HomePage'
import {
  analyzeDocumentJob,
  analyzeFromDiagramJob,
  analyzeFromUmlCodeJob,
  analyzeSystemJob,
  createProject,
  extractDiagram,
  getAnalysisJob,
  getModelReadiness,
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
  analyzeSystemJob: vi.fn(),
  extractDiagram: vi.fn(),
  analyzeFromDiagramJob: vi.fn(),
  analyzeFromUmlCodeJob: vi.fn(),
  analyzeDocumentJob: vi.fn(),
  getAnalysisJob: vi.fn(),
  getModelReadiness: vi.fn(),
  getProjects: vi.fn(),
  createProject: vi.fn(),
}))

vi.mock('../hooks/useOrbitalDashboardData', () => ({
  default: vi.fn(() => ({
    dashboard: {
      operations: [],
      feed: [],
      entities: [],
      hero: {
        operationCount: 0,
        feedCount: 0,
        entityCount: 0,
        criticalCount: 0,
        threatLevel: 'TEAL',
        averageProgress: 0,
      },
    },
    loading: false,
    errors: {
      analyses: '',
      audit: '',
      projects: '',
    },
  })),
}))

function renderHomePage() {
  return render(
    <MemoryRouter>
      <HomePage />
    </MemoryRouter>,
  )
}

function completedJob(jobId, analysisId) {
  return {
    job_id: jobId,
    status: 'succeeded',
    stage: 'completed',
    progress_percent: 100,
    analysis_id: analysisId,
  }
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
    getModelReadiness.mockResolvedValue({
      status: 'ready',
      text: { configured: true, available: true, model: 'llama3.2', error: null },
      vision: { configured: false, available: false, model: null, error: 'Model is not configured.' },
      checked_at: '2026-06-05T00:00:00Z',
    })
    analyzeSystemJob.mockResolvedValue(completedJob('job-text', 101))
    getAnalysisJob.mockImplementation(async (jobId) => {
      const analysisIds = {
        'job-text': 101,
        'job-diagram': 202,
        'job-document': 303,
        'job-uml': 404,
        'job-inline': 505,
      }
      return completedJob(jobId, analysisIds[jobId] || 101)
    })
    extractDiagram.mockResolvedValue({
      extract_id: 'extract-123',
      extracted_system_description: 'Extracted architecture with gateway and database.',
      source_metadata: {
        input_type: 'mermaid',
        extractor_used: 'mermaid_parser_v1',
      },
    })
    analyzeFromDiagramJob.mockResolvedValue(completedJob('job-diagram', 202))
    analyzeFromUmlCodeJob.mockResolvedValue(completedJob('job-uml', 404))
    analyzeDocumentJob.mockResolvedValue(completedJob('job-document', 303))
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('submits text mode analysis', async () => {
    renderHomePage()

    expect(await screen.findByTestId('orbital-dashboard')).toBeInTheDocument()
    expect(screen.getByTestId('orbital-telemetry-header')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'ORBITAL' })).toBeInTheDocument()

    await screen.findByLabelText('Project')

    fireEvent.change(screen.getByLabelText('Analysis Title'), {
      target: { value: 'Text Analysis' },
    })
    fireEvent.change(screen.getByLabelText('System Architecture Description'), {
      target: { value: 'Gateway, auth service, and database with external integrations.' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Analyze System Threats' }))

    await waitFor(() => {
      expect(analyzeSystemJob).toHaveBeenCalledWith(
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

    fireEvent.click(screen.getByRole('button', { name: 'Upload File' }))

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
      expect(analyzeFromDiagramJob).toHaveBeenCalledWith(
        'Diagram Analysis',
        'extract-123',
        'Edited extracted architecture with gateway and identity service.',
        { projectId: 7 },
      )
      expect(mockNavigate).toHaveBeenCalledWith('/analysis/202')
    })
  })

  it('shows normalized backend-unreachable error when API is down', async () => {
    analyzeSystemJob.mockRejectedValue({
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

  it('warns and disables analysis when the text model is unavailable', async () => {
    getModelReadiness.mockResolvedValueOnce({
      status: 'degraded',
      text: {
        configured: true,
        available: false,
        model: 'llama3.2',
        error: "Model 'llama3.2' is not installed in Ollama.",
      },
      vision: { configured: false, available: false, model: null, error: 'Model is not configured.' },
      checked_at: '2026-06-05T00:00:00Z',
    })

    renderHomePage()

    await screen.findByLabelText('Project')

    expect(await screen.findByText(/not installed in Ollama/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Analyze System Threats' })).toBeDisabled()
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
    expect(screen.queryByLabelText('New project name')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'New Project' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Retry project load' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Retry project load' }))

    await waitFor(() => {
      expect(getProjects).toHaveBeenCalledTimes(2)
      expect(screen.getByDisplayValue('Banking Mobile App')).toBeInTheDocument()
    })

    expect(screen.queryByRole('button', { name: 'Retry project load' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'New Project' })).not.toBeDisabled()
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
    expect(screen.getByRole('button', { name: 'New Project' })).toBeInTheDocument()
    expect(screen.queryByLabelText('New project name')).not.toBeInTheDocument()
  })

  it('submits document mode analysis', async () => {
    renderHomePage()

    await screen.findByLabelText('Project')

    fireEvent.click(screen.getByRole('button', { name: 'Upload File' }))
    fireEvent.click(screen.getByRole('button', { name: 'Document' }))

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
      expect(analyzeDocumentJob).toHaveBeenCalledWith('Policy Document Analysis', documentFile, { projectId: 7 })
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
      expect(analyzeFromUmlCodeJob).toHaveBeenCalledWith(
        'UML Threat Model',
        'plantuml',
        '@startuml\nClient -> API\nAPI -> DB\n@enduml',
        { projectId: 7 },
      )
      expect(mockNavigate).toHaveBeenCalledWith('/analysis/404')
    })
  })

  it('loads UML code from attached file and auto-detects format', async () => {
    renderHomePage()

    await screen.findByLabelText('Project')

    fireEvent.click(screen.getByRole('button', { name: 'UML Code' }))
    fireEvent.change(screen.getByLabelText('UML Format'), {
      target: { value: 'plantuml' },
    })

    const umlFile = new File(['graph TD\nClient --> API\nAPI --> DB'], 'system.mmd', {
      type: 'text/plain',
    })
    fireEvent.change(screen.getByLabelText('Attach UML/Mermaid File (Optional)'), {
      target: { files: [umlFile] },
    })

    await waitFor(() => {
      expect(screen.getByLabelText('UML Code')).toHaveValue('graph TD\nClient --> API\nAPI --> DB')
      expect(screen.getByLabelText('UML Format')).toHaveValue('mermaid')
      expect(screen.getByText('Loaded file: system.mmd')).toBeInTheDocument()
    })
  })

  it('creates a project inline and uses it for analysis', async () => {
    renderHomePage()

    await screen.findByLabelText('Project')
    fireEvent.click(screen.getByRole('button', { name: 'New Project' }))
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
      expect(analyzeSystemJob).toHaveBeenCalledWith(
        'Inline Analysis',
        'Gateway, auth service, and database with external integrations.',
        { projectId: 8 },
      )
    })
  })
})
