const RISK_COLORS = {
  Critical: '#FF4D4D',
  High: '#FF6B6B',
  Medium: '#FFA500',
  Low: '#00FF94',
};

const STRIDE_CHART_CATEGORIES = [
  { name: 'Spoofing', source: 'Spoofing' },
  { name: 'Tampering', source: 'Tampering' },
  { name: 'Repudiation', source: 'Repudiation' },
  { name: 'Info Disclosure', source: 'Information Disclosure' },
  { name: 'DoS', source: 'Denial of Service' },
  { name: 'Elevation', source: 'Elevation of Privilege' },
];

export function buildRiskDistribution(threats) {
  return [
    { name: 'Critical', value: threats.filter((t) => t.risk_level === 'Critical').length, color: RISK_COLORS.Critical },
    { name: 'High', value: threats.filter((t) => t.risk_level === 'High').length, color: RISK_COLORS.High },
    { name: 'Medium', value: threats.filter((t) => t.risk_level === 'Medium').length, color: RISK_COLORS.Medium },
    { name: 'Low', value: threats.filter((t) => t.risk_level === 'Low').length, color: RISK_COLORS.Low },
  ].filter((entry) => entry.value > 0);
}

export function buildStrideDistribution(threats) {
  return STRIDE_CHART_CATEGORIES.map((category) => ({
    name: category.name,
    count: threats.filter((t) => t.stride_category === category.source).length,
  })).filter((entry) => entry.count > 0);
}

export function buildRiskDistributionFromSummary(summary) {
  if (!summary) return [];
  return [
    { name: 'Critical', value: Number(summary.critical_count || 0), color: RISK_COLORS.Critical },
    { name: 'High', value: Number(summary.high_count || 0), color: RISK_COLORS.High },
    { name: 'Medium', value: Number(summary.medium_count || 0), color: RISK_COLORS.Medium },
    { name: 'Low', value: Number(summary.low_count || 0), color: RISK_COLORS.Low },
  ].filter((entry) => entry.value > 0);
}

export function buildStrideDistributionFromSummary(summary) {
  if (!summary) return [];
  const strideDistribution = summary.stride_distribution || {};
  return STRIDE_CHART_CATEGORIES.map((category) => ({
    name: category.name,
    count: Number(strideDistribution[category.source] || 0),
  })).filter((entry) => entry.count > 0);
}

export function getHighRiskCount(threats) {
  return threats.filter((t) => ['Critical', 'High'].includes(t.risk_level)).length;
}

export function sortThreatsByRisk(threats) {
  return [...threats].sort((a, b) => b.risk_score - a.risk_score);
}

export function formatIssueKey(issue) {
  return `${issue.name}-${issue.stride_category}-${issue.affected_component}`;
}
