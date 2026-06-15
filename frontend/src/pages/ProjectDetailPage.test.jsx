import React from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

import ProjectDetailPage from './ProjectDetailPage'
import { getProject, getProjectActivity, getProjectAnalyses, updateProject } from '../services/api'

vi.mock('../services/api', () => ({
  getProject: vi.fn(),
  getProjectAnalyses: vi.fn(),
  getProjectActivity: vi.fn(),
  updateProject: vi.fn(),
}))

function renderProjectDetailPage() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/projects/7']}>
        <Routes>
          <Route path="/projects/:projectId" element={<ProjectDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('ProjectDetailPage', () => {
  beforeEach(() => {
    getProject.mockResolvedValue({
      id: 7,
      user_id: 1,
      name: 'Banking Mobile App',
      description: 'Mobile banking workspace',
      created_at: '2026-01-01T10:00:00Z',
      updated_at: '2026-01-02T10:00:00Z',
      analysis_count: 1,
      latest_analysis_id: 42,
      latest_analysis_title: 'Banking v2',
      latest_analysis_at: '2026-01-02T10:00:00Z',
      latest_risk_score: 12.4,
      total_threat_count: 8,
      high_risk_count: 3,
    })
    getProjectAnalyses.mockResolvedValue({
      items: [
        {
          id: 42,
          project_id: 7,
          project: { id: 7, name: 'Banking Mobile App' },
          title: 'Banking v2',
          created_at: '2026-01-02T10:00:00Z',
          total_risk_score: 12.4,
          threat_count: 8,
          high_risk_count: 3,
          analysis_time: 0.8,
        },
      ],
      total: 1,
      skip: 0,
      limit: 20,
      has_more: false,
    })
    getProjectActivity.mockResolvedValue([
      {
        id: 1,
        user_id: 1,
        project_id: 7,
        analysis_id: 42,
        action: 'analysis_created',
        event_metadata: { title: 'Banking v2' },
        created_at: '2026-01-02T10:00:00Z',
      },
    ])
    updateProject.mockResolvedValue({
      id: 7,
      user_id: 1,
      name: 'Banking Mobile App',
      description: 'Mobile banking workspace',
      created_at: '2026-01-01T10:00:00Z',
      updated_at: '2026-01-02T10:00:00Z',
      analysis_count: 1,
      latest_analysis_id: 42,
      latest_analysis_title: 'Banking v2',
      latest_analysis_at: '2026-01-02T10:00:00Z',
      latest_risk_score: 12.4,
      total_threat_count: 8,
      high_risk_count: 3,
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('renders project overview, analyses, and activity', async () => {
    renderProjectDetailPage()

    expect(await screen.findByText('Banking Mobile App')).toBeInTheDocument()
    expect(screen.getAllByText('Banking v2').length).toBeGreaterThan(0)
    expect(screen.getByText('Analysis created')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Compare/i })).toHaveAttribute('href', '/compare?project_id=7')
  })

  it('updates project details from inline edit form', async () => {
    updateProject.mockResolvedValueOnce({
      id: 7,
      user_id: 1,
      name: 'Banking Mobile App v2',
      description: 'Updated workspace description',
      created_at: '2026-01-01T10:00:00Z',
      updated_at: '2026-01-03T10:00:00Z',
      analysis_count: 1,
      latest_analysis_id: 42,
      latest_analysis_title: 'Banking v2',
      latest_analysis_at: '2026-01-02T10:00:00Z',
      latest_risk_score: 12.4,
      total_threat_count: 8,
      high_risk_count: 3,
    })

    renderProjectDetailPage()

    await screen.findByText('Banking Mobile App')

    fireEvent.click(screen.getByRole('button', { name: 'Edit Project' }))
    fireEvent.change(screen.getByLabelText('Project Name'), {
      target: { value: 'Banking Mobile App v2' },
    })
    fireEvent.change(screen.getByLabelText('Project Description'), {
      target: { value: 'Updated workspace description' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => {
      expect(updateProject).toHaveBeenCalledWith('7', {
        name: 'Banking Mobile App v2',
        description: 'Updated workspace description',
      })
    })
    expect(await screen.findByText('Banking Mobile App v2')).toBeInTheDocument()
    expect(screen.getByText('Updated workspace description')).toBeInTheDocument()
  })

  it('shows inline validation and API errors while editing', async () => {
    updateProject.mockRejectedValueOnce({
      response: { data: { detail: 'A project with this name already exists' } },
    })

    renderProjectDetailPage()
    await screen.findByText('Banking Mobile App')

    fireEvent.click(screen.getByRole('button', { name: 'Edit Project' }))
    fireEvent.change(screen.getByLabelText('Project Name'), { target: { value: '   ' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(await screen.findByText('Project name cannot be blank.')).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Project Name'), { target: { value: 'Banking Mobile App' } })
    fireEvent.change(screen.getByLabelText('Project Description'), { target: { value: 'Conflicting description' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(await screen.findByText('A project with this name already exists')).toBeInTheDocument()
  })

  it('cancels edit mode and restores existing project values', async () => {
    renderProjectDetailPage()
    await screen.findByText('Banking Mobile App')

    fireEvent.click(screen.getByRole('button', { name: 'Edit Project' }))
    fireEvent.change(screen.getByLabelText('Project Name'), { target: { value: 'Temporary Name' } })
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(screen.queryByLabelText('Project Name')).not.toBeInTheDocument()
    expect(screen.getByText('Banking Mobile App')).toBeInTheDocument()
  })
})
