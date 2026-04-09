import React from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

import ComparePage from './ComparePage'
import { getAnalyses } from '../services/api'

vi.mock('../services/api', () => ({
  getAnalyses: vi.fn(),
  compareAnalyses: vi.fn(),
}))

vi.mock('recharts', () => ({
  Radar: () => <div />,
  RadarChart: ({ children }) => <div>{children}</div>,
  PolarGrid: () => <div />,
  PolarAngleAxis: () => <div />,
  PolarRadiusAxis: () => <div />,
  ResponsiveContainer: ({ children }) => <div>{children}</div>,
  Tooltip: () => <div />,
  Legend: () => <div />,
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
