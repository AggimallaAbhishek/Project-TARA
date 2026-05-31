export function buildRiskDistribution(threats) {
  return [
    { name: 'Critical', value: threats.filter((t) => t.risk_level === 'Critical').length, color: '#FF4D4D' },
    { name: 'High', value: threats.filter((t) => t.risk_level === 'High').length, color: '#FF6B6B' },
    { name: 'Medium', value: threats.filter((t) => t.risk_level === 'Medium').length, color: '#FFA500' },
    { name: 'Low', value: threats.filter((t) => t.risk_level === 'Low').length, color: '#00FF94' },
  ].filter((entry) => entry.value > 0);
}

export function buildStrideDistribution(threats) {
  return [
    { name: 'Spoofing', count: threats.filter((t) => t.stride_category === 'Spoofing').length },
    { name: 'Tampering', count: threats.filter((t) => t.stride_category === 'Tampering').length },
    { name: 'Repudiation', count: threats.filter((t) => t.stride_category === 'Repudiation').length },
    { name: 'Info Disclosure', count: threats.filter((t) => t.stride_category === 'Information Disclosure').length },
    { name: 'DoS', count: threats.filter((t) => t.stride_category === 'Denial of Service').length },
    { name: 'Elevation', count: threats.filter((t) => t.stride_category === 'Elevation of Privilege').length },
  ].filter((entry) => entry.count > 0);
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
