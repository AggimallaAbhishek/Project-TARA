import React from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'

import ThreatListSection from './ThreatListSection'

const threats = [
  {
    id: 1,
    name: 'Session spoofing',
    description: 'Attacker can replay weak session tokens.',
    stride_category: 'Spoofing',
    affected_component: 'Auth Gateway',
    risk_level: 'Critical',
    likelihood: 4,
    impact: 4,
    risk_score: 16,
    mitigation: 'Rotate tokens.',
  },
  {
    id: 2,
    name: 'Inventory tampering',
    description: 'Inventory records can be modified without integrity checks.',
    stride_category: 'Tampering',
    affected_component: 'Inventory API',
    risk_level: 'Medium',
    likelihood: 2,
    impact: 4,
    risk_score: 8,
    mitigation: 'Add signed writes.',
  },
]

describe('ThreatListSection', () => {
  it('filters threats by search, risk, and STRIDE category', () => {
    render(<ThreatListSection threats={threats} />)

    fireEvent.change(screen.getByLabelText('Search threats'), {
      target: { value: 'inventory' },
    })

    expect(screen.getByText('Inventory tampering')).toBeInTheDocument()
    expect(screen.queryByText('Session spoofing')).not.toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Search threats'), {
      target: { value: '' },
    })
    fireEvent.change(screen.getByLabelText('Risk'), {
      target: { value: 'Critical' },
    })

    expect(screen.getByText('Session spoofing')).toBeInTheDocument()
    expect(screen.queryByText('Inventory tampering')).not.toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Risk'), {
      target: { value: 'all' },
    })
    fireEvent.change(screen.getByLabelText('STRIDE'), {
      target: { value: 'Tampering' },
    })

    expect(screen.getByText('Inventory tampering')).toBeInTheDocument()
    expect(screen.queryByText('Session spoofing')).not.toBeInTheDocument()
  })

  it('expands and collapses visible threats in bulk', () => {
    render(<ThreatListSection threats={threats} />)

    fireEvent.click(screen.getByRole('button', { name: 'Expand All' }))

    expect(screen.getByText('Attacker can replay weak session tokens.')).toBeInTheDocument()
    expect(screen.getByText('Inventory records can be modified without integrity checks.')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Collapse All' }))

    await waitFor(() => {
      expect(screen.queryByText('Attacker can replay weak session tokens.')).not.toBeInTheDocument()
      expect(screen.queryByText('Inventory records can be modified without integrity checks.')).not.toBeInTheDocument()
    })
  })

  it('tracks frontend-only remediation status and filters by it', () => {
    render(<ThreatListSection threats={threats} />)

    fireEvent.click(screen.getByRole('button', { name: 'Expand All' }))
    fireEvent.change(screen.getAllByLabelText('Remediation Status')[0], {
      target: { value: 'Mitigated' },
    })
    fireEvent.change(screen.getByLabelText('Status'), {
      target: { value: 'Mitigated' },
    })

    expect(screen.getByText('Session spoofing')).toBeInTheDocument()
    expect(screen.queryByText('Inventory tampering')).not.toBeInTheDocument()
  })
})
