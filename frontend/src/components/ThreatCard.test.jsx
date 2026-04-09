import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'

import ThreatCard from './ThreatCard'

function makeThreat(overrides = {}) {
  return {
    id: 11,
    name: 'SQL Injection',
    description: 'Injection risk in query handling.',
    stride_category: 'Tampering',
    affected_component: 'API Server',
    risk_level: 'High',
    likelihood: 4,
    impact: 4,
    risk_score: 16,
    mitigation: 'Use prepared statements.',
    ...overrides,
  }
}

describe('ThreatCard', () => {
  it('renders mitigation as ordered steps when multiline steps are provided', () => {
    const threat = makeThreat({
      mitigation: '1. Use prepared statements.\n2. Add strict input validation.\n3. Run SQLi security tests in CI.',
    })
    render(<ThreatCard threat={threat} />)

    fireEvent.click(screen.getByRole('button', { name: /SQL Injection/i }))

    expect(screen.getByText('Use prepared statements.')).toBeInTheDocument()
    expect(screen.getByText('Add strict input validation.')).toBeInTheDocument()
    expect(screen.getByText('Run SQLi security tests in CI.')).toBeInTheDocument()
  })

  it('renders mitigation as plain text when only one sentence is provided', () => {
    const threat = makeThreat({ mitigation: 'Use prepared statements and least-privilege DB users.' })
    render(<ThreatCard threat={threat} />)

    fireEvent.click(screen.getByRole('button', { name: /SQL Injection/i }))

    expect(
      screen.getByText('Use prepared statements and least-privilege DB users.'),
    ).toBeInTheDocument()
  })

  it('removes wrapping brackets and quotes from mitigation content', () => {
    const threat = makeThreat({
      mitigation:
        "1. ['Define trust boundaries.\n2. implement explicit trust boundaries around sensitive components'.\n3. 'Use network segmentation between trust zones'].",
    })
    render(<ThreatCard threat={threat} />)

    fireEvent.click(screen.getByRole('button', { name: /SQL Injection/i }))

    expect(screen.getByText('Define trust boundaries.')).toBeInTheDocument()
    expect(screen.getByText(/implement explicit trust boundaries/i)).toBeInTheDocument()
    expect(screen.queryByText(/\[/)).not.toBeInTheDocument()
  })
})
