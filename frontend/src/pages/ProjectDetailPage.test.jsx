import React from 'react'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

import ProjectDetailPage from './ProjectDetailPage'
import { getProject, getProjectActivity, getProjectAnalyses } from '../services/api'

vi.mock('../services/api', () => ({
  getProject: vi.fn(),
  getProjectAnalyses: vi.fn(),
  getProjectActivity: vi.fn(),
}))

function renderProjectDetailPage() {
  return render(
    <MemoryRouter initialEntries={['/projects/7']}>
      <Routes>
        <Route path="/projects/:projectId" element={<ProjectDetailPage />} />
      </Routes>
    </MemoryRouter>,
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
})
