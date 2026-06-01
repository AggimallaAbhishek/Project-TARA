export const STRIDE_CATEGORIES = [
  'Spoofing',
  'Tampering',
  'Repudiation',
  'Information Disclosure',
  'Denial of Service',
  'Elevation of Privilege',
];

export const CHART_COLORS = ['#5ecad3', '#6d99c7', '#66cfa4', '#f4c15d', '#ff9a62'];
export const ANALYSES_PAGE_SIZE = 100;
export const SEARCH_DEBOUNCE_MS = 300;

export function getRiskColor(level) {
  switch (level) {
    case 'Critical': return 'text-risk-critical';
    case 'High': return 'text-risk-high';
    case 'Medium': return 'text-risk-medium';
    case 'Low': return 'text-risk-low';
    default: return 'text-text-secondary';
  }
}

export function getRiskBadgeLevel(score) {
  if (score >= 16) return 'Critical';
  if (score >= 10) return 'High';
  if (score >= 5) return 'Medium';
  return 'Low';
}

export function filterAnalysesByTitle(analyses, searchFilter) {
  const normalizedFilter = searchFilter.toLowerCase();
  return analyses.filter((analysis) => analysis.title.toLowerCase().includes(normalizedFilter));
}

export function buildRadarData(comparison) {
  if (!comparison) {
    return [];
  }

  return STRIDE_CATEGORIES.map((category) => {
    const point = {
      category: category.length > 12 ? category.split(' ')[0] : category,
      fullCategory: category,
    };
    comparison.analyses.forEach((analysis) => {
      point[analysis.title] = analysis.stride_distribution[category] || 0;
    });
    return point;
  });
}
