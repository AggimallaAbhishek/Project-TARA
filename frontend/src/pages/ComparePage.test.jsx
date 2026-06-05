import React from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

import ComparePage from './ComparePage'
import { getAnalyses } from '../services/api'

vi.mock('../services/api', () => ({
  getAnalyses: vi.fn(),
  getProject: vi.fn(),
  compareAnalyses: vi.fn(),
}))

vi.mock('recharts', () => ({
  Radar: () => <div />,
  RadarChart: ({ children }) => <div>{children}</div>,
  PolarGrid: () => <div />,
  PolarAngleAxis: () => <div />,
  PolarRadiusAxis: () => <div />,
  Tooltip: () => <div />,
  Legend: () => <div />,
}))

vi.mock('../components/ChartFrame', () => ({
  default: ({ children, height = 320, minWidth = 320 }) => (
    <div>{children(minWidth, height)}</div>
  ),
}))

function renderComparePage() {
  return render(
    <MemoryRouter>
      <ComparePage />
    </MemoryRouter>,
  )
}

describe('ComparePage', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('shows normalized backend-unreachable message when loading analyses fails', async () => {
    getAnalyses.mockRejectedValue({
      code: 'ERR_NETWORK',
      message: 'Network Error',
      config: { url: '/analyses' },
    })

    renderComparePage()

    expect(
      await screen.findByText(/Cannot reach the backend service/i),
    ).toBeInTheDocument()
  })

  it('passes query text using q parameter for API search', async () => {
    getAnalyses.mockResolvedValue({
      items: [],
      total: 0,
      skip: 0,
      limit: 100,
      has_more: false,
    })

    renderComparePage()

    await waitFor(() => {
      expect(getAnalyses).toHaveBeenCalledWith({
        skip: 0,
        limit: 100,
        q: undefined,
      })
    })
  })

  it('loads analyses across multiple pages until has_more is false', async () => {
    getAnalyses
      .mockResolvedValueOnce({
        items: [{ id: 1, title: 'Analysis A', total_risk_score: 10 }],
        total: 2,
        skip: 0,
        limit: 100,
        has_more: true,
      })
      .mockResolvedValueOnce({
        items: [{ id: 2, title: 'Analysis B', total_risk_score: 8 }],
        total: 2,
        skip: 1,
        limit: 100,
        has_more: false,
      })

    renderComparePage()

    await waitFor(() => {
      expect(getAnalyses).toHaveBeenNthCalledWith(1, {
        skip: 0,
        limit: 100,
        q: undefined,
      })
      expect(getAnalyses).toHaveBeenNthCalledWith(2, {
        skip: 1,
        limit: 100,
        q: undefined,
      })
    })
  })

  it('shows project, date, risk, and threat metadata in the picker', async () => {
    const createdAt = '2026-01-01T10:00:00Z'
    getAnalyses.mockResolvedValue({
      items: [
        {
          id: 42,
          title: 'Payment Service',
          project: { id: 7, name: 'Payments Workspace' },
          created_at: createdAt,
          total_risk_score: 16,
          threat_count: 4,
          high_risk_count: 2,
        },
      ],
      total: 1,
      skip: 0,
      limit: 100,
      has_more: false,
    })

    renderComparePage()

    await waitFor(() => {
      expect(getAnalyses).toHaveBeenCalled()
    })

    fireEvent.click(screen.getByRole('button', { name: /click to select analyses/i }))

    expect(screen.getByText('Payments Workspace')).toBeInTheDocument()
    expect(screen.getByText(new Date(createdAt).toLocaleDateString())).toBeInTheDocument()
    expect(screen.getByText('4 threats')).toBeInTheDocument()
    expect(screen.getByText('2 high/critical')).toBeInTheDocument()
    expect(screen.getByText('Score 16.0')).toBeInTheDocument()
    expect(screen.getByText('Critical')).toBeInTheDocument()
  })

  it('applies search text via debounced q parameter', async () => {
    getAnalyses.mockResolvedValue({
      items: [],
      total: 0,
      skip: 0,
      limit: 100,
      has_more: false,
    })

    renderComparePage()

    await waitFor(() => {
      expect(getAnalyses).toHaveBeenCalledWith({
        skip: 0,
        limit: 100,
        q: undefined,
      })
    })

    vi.clearAllMocks()

    fireEvent.click(screen.getByRole('button', { name: /click to select analyses/i }))
    fireEvent.change(screen.getByPlaceholderText(/filter analyses/i), {
      target: { value: 'bank' },
    })

    // Debounce should prevent immediate request.
    expect(getAnalyses).not.toHaveBeenCalled()

    await new Promise((resolve) => setTimeout(resolve, 330))

    await waitFor(() => {
      expect(getAnalyses).toHaveBeenCalledWith({
        skip: 0,
        limit: 100,
        q: 'bank',
      })
    })
  })
})
