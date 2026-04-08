import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
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
      limit: 200,
      has_more: false,
    })

    renderComparePage()

    await waitFor(() => {
      expect(getAnalyses).toHaveBeenCalledWith({
        limit: 200,
        q: undefined,
      })
    })
  })
})
