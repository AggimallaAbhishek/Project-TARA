import {
  buildRiskDistribution,
  buildStrideDistribution,
  getHighRiskCount,
  sortThreatsByRisk,
} from './analysisMetrics'

const sampleThreats = [
  { id: 1, risk_level: 'Critical', stride_category: 'Spoofing', risk_score: 16.0 },
  { id: 2, risk_level: 'High', stride_category: 'Tampering', risk_score: 12.5 },
  { id: 3, risk_level: 'Low', stride_category: 'Spoofing', risk_score: 3.0 },
]

describe('analysisMetrics', () => {
  it('builds risk distribution counts and omits zero values', () => {
    expect(buildRiskDistribution(sampleThreats)).toEqual([
      { name: 'Critical', value: 1, color: '#FF4D4D' },
      { name: 'High', value: 1, color: '#FF6B6B' },
      { name: 'Low', value: 1, color: '#00FF94' },
    ])
  })

  it('builds STRIDE distribution counts and omits zero values', () => {
    expect(buildStrideDistribution(sampleThreats)).toEqual([
      { name: 'Spoofing', count: 2 },
      { name: 'Tampering', count: 1 },
    ])
  })

  it('counts high and critical threats', () => {
    expect(getHighRiskCount(sampleThreats)).toBe(2)
  })

  it('sorts threats by descending risk score without mutating input', () => {
    const sorted = sortThreatsByRisk(sampleThreats)
    expect(sorted.map((item) => item.id)).toEqual([1, 2, 3])
    expect(sampleThreats.map((item) => item.id)).toEqual([1, 2, 3])
  })
})
