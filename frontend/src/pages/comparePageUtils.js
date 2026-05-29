export const STRIDE_CATEGORIES = [
  'Spoofing',
  'Tampering',
  'Repudiation',
  'Information Disclosure',
  'Denial of Service',
  'Elevation of Privilege',
];

export const CHART_COLORS = ['#06d6a0', '#118ab2', '#ef476f', '#ffd166', '#073b4c'];
export const ANALYSES_PAGE_SIZE = 100;
export const SEARCH_DEBOUNCE_MS = 300;

export function getRiskColor(level) {
  switch (level) {
    case 'Critical': return 'text-red-400';
    case 'High': return 'text-orange-400';
    case 'Medium': return 'text-yellow-400';
    case 'Low': return 'text-green-400';
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
