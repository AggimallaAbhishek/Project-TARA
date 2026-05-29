import React from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

import HistoryPage from './HistoryPage'
import { getAnalyses, getProjects } from '../services/api'

vi.mock('../services/api', () => ({
  getAnalyses: vi.fn(),
  getProjects: vi.fn(),
  deleteAnalysis: vi.fn(),
}))

function renderHistoryPage() {
  return render(
    <MemoryRouter>
      <HistoryPage />
    </MemoryRouter>,
  )
}

describe('HistoryPage', () => {
  beforeEach(() => {
    getAnalyses.mockResolvedValue({
      items: [],
      total: 0,
      skip: 0,
      limit: 20,
      has_more: false,
    })
    getProjects.mockResolvedValue({
      items: [{ id: 7, name: 'Banking Mobile App' }],
      total: 1,
      skip: 0,
      limit: 100,
      has_more: false,
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('sends search and filter params to getAnalyses', async () => {
    renderHistoryPage()

    await waitFor(() => {
      expect(getAnalyses).toHaveBeenCalledTimes(1)
    })
    await screen.findByLabelText('Risk Level')

    fireEvent.change(screen.getByLabelText('Risk Level'), { target: { value: 'High' } })
    fireEvent.change(screen.getByLabelText('STRIDE Category'), { target: { value: 'Tampering' } })
    fireEvent.change(screen.getByLabelText('Project'), { target: { value: '7' } })
    fireEvent.change(screen.getByLabelText('Date From'), { target: { value: '2026-01-01' } })
    fireEvent.change(screen.getByLabelText('Date To'), { target: { value: '2026-01-31' } })
    fireEvent.change(screen.getByLabelText('Search analyses'), { target: { value: 'Payment' } })
    fireEvent.click(screen.getByRole('button', { name: 'Apply Search' }))

    await waitFor(() => {
      expect(getAnalyses).toHaveBeenLastCalledWith({
        skip: 0,
        limit: 20,
        q: 'Payment',
        risk_level: 'High',
        stride_category: 'Tampering',
        project_id: 7,
        date_from: '2026-01-01',
        date_to: '2026-01-31',
      })
    })
  })

  it('advances pagination with skip/limit params', async () => {
    getAnalyses.mockResolvedValue({
      items: [
        {
          id: 1,
          title: 'Analysis One',
          created_at: '2026-01-01T10:00:00',
          total_risk_score: 8.2,
          threat_count: 2,
          high_risk_count: 1,
          analysis_time: 1.2,
          project_id: 7,
          project: { id: 7, name: 'Banking Mobile App' },
        },
      ],
      total: 45,
      skip: 0,
      limit: 20,
      has_more: true,
    })

    renderHistoryPage()

    await waitFor(() => {
      expect(getAnalyses).toHaveBeenCalledWith({
        skip: 0,
        limit: 20,
        q: '',
        risk_level: '',
        stride_category: '',
        project_id: '',
        date_from: '',
        date_to: '',
      })
    })

    fireEvent.click(screen.getByRole('button', { name: /Next/i }))

    await waitFor(() => {
      expect(getAnalyses).toHaveBeenLastCalledWith({
        skip: 20,
        limit: 20,
        q: '',
        risk_level: '',
        stride_category: '',
        project_id: '',
        date_from: '',
        date_to: '',
      })
    })
  })

  it('shows normalized backend-unreachable message when history API fails', async () => {
    getAnalyses.mockRejectedValue({
      code: 'ERR_NETWORK',
      message: 'Network Error',
      config: { url: '/analyses' },
    })

    renderHistoryPage()

    expect(
      await screen.findByText(/Cannot reach the backend service/i),
    ).toBeInTheDocument()
  })
})
