import React from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'

import ProjectsPage from './ProjectsPage'
import { createProject, getProjects } from '../services/api'

vi.mock('../services/api', () => ({
  getProjects: vi.fn(),
  createProject: vi.fn(),
}))

function renderProjectsPage() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <ProjectsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('ProjectsPage', () => {
  beforeEach(() => {
    getProjects.mockResolvedValue({
      items: [
        {
          id: 7,
          user_id: 1,
          name: 'Banking Mobile App',
          description: 'Mobile banking workspace',
          created_at: '2026-01-01T10:00:00Z',
          updated_at: '2026-01-02T10:00:00Z',
          analysis_count: 2,
          latest_analysis_id: 42,
          latest_analysis_title: 'Banking v2',
          latest_analysis_at: '2026-01-02T10:00:00Z',
          latest_risk_score: 12.4,
          total_threat_count: 18,
          high_risk_count: 5,
        },
      ],
      total: 1,
      skip: 0,
      limit: 100,
      has_more: false,
    })
    createProject.mockResolvedValue({ id: 8, name: 'New Project' })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('renders project cards from the API', async () => {
    renderProjectsPage()

    expect(await screen.findByText('Banking Mobile App')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.getByText('12.4')).toBeInTheDocument()
  })

  it('creates a project from the page form', async () => {
    renderProjectsPage()

    await screen.findByText('Banking Mobile App')
    fireEvent.change(screen.getByLabelText('Project name'), {
      target: { value: 'E-Commerce Platform' },
    })
    fireEvent.change(screen.getByLabelText('Project description'), {
      target: { value: 'Marketplace threat model' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Create Project' }))

    await waitFor(() => {
      expect(createProject).toHaveBeenCalledWith({
        name: 'E-Commerce Platform',
        description: 'Marketplace threat model',
      })
    })
  })

  it('shows empty state when there are no projects', async () => {
    getProjects.mockResolvedValueOnce({
      items: [],
      total: 0,
      skip: 0,
      limit: 100,
      has_more: false,
    })

    renderProjectsPage()

    expect(await screen.findByText('No projects yet')).toBeInTheDocument()
  })
})
