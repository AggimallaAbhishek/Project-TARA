import React from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

import AnalysisPage from './AnalysisPage'
import { downloadAnalysisPdf, getAnalysis, getAnalysisVersionComparison } from '../services/api'

vi.mock('../services/api', () => ({
  getAnalysis: vi.fn(),
  downloadAnalysisPdf: vi.fn(),
  getAnalysisVersionComparison: vi.fn(),
}))

vi.mock('../components/ThreatCard', () => ({
  default: () => <div>Threat Card</div>,
}))

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }) => <div>{children}</div>,
  PieChart: ({ children }) => <div>{children}</div>,
  Pie: ({ children }) => <div>{children}</div>,
  Cell: () => <div />,
  BarChart: ({ children }) => <div>{children}</div>,
  Bar: () => <div />,
  XAxis: () => <div />,
  YAxis: () => <div />,
  Tooltip: () => <div />,
}))

function renderAnalysisPage() {
  return render(
    <MemoryRouter initialEntries={['/analysis/42']}>
      <Routes>
        <Route path="/analysis/:id" element={<AnalysisPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('AnalysisPage PDF export', () => {
  beforeEach(() => {
    getAnalysis.mockResolvedValue({
      id: 42,
      title: 'Payments Platform',
      created_at: '2026-01-01T10:00:00',
      analysis_time: 0.3,
      total_risk_score: 8.0,
      system_description: 'System description',
      threats: [],
    })
    getAnalysisVersionComparison.mockResolvedValue({
      current_analysis_id: 42,
      current_created_at: '2026-01-01T10:00:00',
      previous_analysis_id: null,
      previous_created_at: null,
      has_previous_version: false,
      previous_total_issues: 0,
      resolved_issues_count: 0,
      unresolved_issues_count: 0,
      new_issues_count: 0,
      resolved_issues: [],
      unresolved_issues: [],
      new_issues: [],
    })

    const nativeCreateElement = document.createElement.bind(document)
    vi.spyOn(document, 'createElement').mockImplementation((tagName, options) => {
      const element = nativeCreateElement(tagName, options)
      if (tagName === 'a') {
        element.click = vi.fn()
      }
      return element
    })

    if (!window.URL.createObjectURL) {
      window.URL.createObjectURL = vi.fn(() => 'blob:test-url')
    } else {
      vi.spyOn(window.URL, 'createObjectURL').mockReturnValue('blob:test-url')
    }

    if (!window.URL.revokeObjectURL) {
      window.URL.revokeObjectURL = vi.fn()
    } else {
      vi.spyOn(window.URL, 'revokeObjectURL').mockImplementation(() => {})
    }
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('calls API when user clicks Download PDF Report', async () => {
    downloadAnalysisPdf.mockResolvedValue({
      data: new Blob(['pdf-content'], { type: 'application/pdf' }),
      headers: { 'content-disposition': 'attachment; filename="report.pdf"' },
    })

    renderAnalysisPage()

    await screen.findByText('Payments Platform')
    fireEvent.click(screen.getByRole('button', { name: 'Download PDF Report' }))

    await waitFor(() => {
      expect(downloadAnalysisPdf).toHaveBeenCalledWith('42')
    })
  })

  it('shows error message when PDF download fails', async () => {
    downloadAnalysisPdf.mockRejectedValue({
      response: {
        data: { detail: 'PDF export unavailable' },
      },
    })

    renderAnalysisPage()

    await screen.findByText('Payments Platform')
    fireEvent.click(screen.getByRole('button', { name: 'Download PDF Report' }))

    expect(await screen.findByText('PDF export unavailable')).toBeInTheDocument()
  })

  it('shows normalized backend-unreachable message when analysis fetch fails', async () => {
    getAnalysis.mockRejectedValueOnce({
      code: 'ERR_NETWORK',
      message: 'Network Error',
      config: { url: '/analyses/42' },
    })

    renderAnalysisPage()

    expect(
      await screen.findByText(/Cannot reach the backend service/i),
    ).toBeInTheDocument()
  })

  it('shows baseline message when there is no previous version', async () => {
    renderAnalysisPage()
    expect(
      await screen.findByText(/This is the first version for this title/i),
    ).toBeInTheDocument()
  })
})
