import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
// eslint-disable-next-line no-unused-vars
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeft,
  BarChart3,
  Check,
  ChevronDown,
  GitCompareArrows,
  Loader2,
  Search,
  ShieldAlert,
  TrendingDown,
  TrendingUp,
  X,
} from 'lucide-react';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts';

import LoadingSpinner from '../components/LoadingSpinner';
import RiskBadge from '../components/RiskBadge';
import { compareAnalyses, getAnalyses } from '../services/api';

const STRIDE_CATEGORIES = [
  'Spoofing',
  'Tampering',
  'Repudiation',
  'Information Disclosure',
  'Denial of Service',
  'Elevation of Privilege',
];

const CHART_COLORS = ['#06d6a0', '#118ab2', '#ef476f', '#ffd166', '#073b4c'];

export default function ComparePage() {
  const [analyses, setAnalyses] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [selectedIds, setSelectedIds] = useState([]);
  const [comparison, setComparison] = useState(null);
  const [comparing, setComparing] = useState(false);
  const [error, setError] = useState(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');

  // Load all analyses for picker
  useEffect(() => {
    const loadAnalyses = async () => {
      try {
        const data = await getAnalyses({ limit: 100 });
        setAnalyses(data.items || []);
      } catch (err) {
        setError(err.response?.data?.detail || 'Failed to load analyses');
      } finally {
        setLoadingList(false);
      }
    };
    loadAnalyses();
  }, []);

  const toggleSelection = (id) => {
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 5) return prev;
      return [...prev, id];
    });
  };

  const handleCompare = async () => {
    if (selectedIds.length < 2) return;
    setComparing(true);
    setError(null);
    try {
      const data = await compareAnalyses(selectedIds);
      setComparison(data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Comparison failed');
    } finally {
      setComparing(false);
    }
  };

  const getRiskColor = (level) => {
    switch (level) {
      case 'Critical': return 'text-red-400';
      case 'High': return 'text-orange-400';
      case 'Medium': return 'text-yellow-400';
      case 'Low': return 'text-green-400';
      default: return 'text-text-secondary';
    }
  };

  const getRiskBadgeLevel = (score) => {
    if (score >= 16) return 'Critical';
    if (score >= 10) return 'High';
    if (score >= 5) return 'Medium';
    return 'Low';
  };

  const filteredAnalyses = analyses.filter((a) =>
    a.title.toLowerCase().includes(searchFilter.toLowerCase())
  );

  if (loadingList) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <LoadingSpinner text="Loading analyses..." />
      </div>
    );
  }

  // Build radar chart data from comparison
  const radarData = comparison
    ? STRIDE_CATEGORIES.map((cat) => {
        const point = { category: cat.length > 12 ? cat.split(' ')[0] : cat, fullCategory: cat };
        comparison.analyses.forEach((a) => {
          point[a.title] = a.stride_distribution[cat] || 0;
        });
        return point;
      })
    : [];

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-between items-center mb-8"
      >
        <div>
          <h1 className="text-3xl font-bold font-display text-text-primary flex items-center gap-3">
            <GitCompareArrows className="w-8 h-8 text-cyber-cyan" />
            Compare Analyses
          </h1>
          <p className="text-text-secondary mt-1">
            Select 2–5 analyses to compare side-by-side
          </p>
        </div>
        <Link to="/history">
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="btn-secondary flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back to History
          </motion.button>
        </Link>
      </motion.div>

      {/* Analysis Selector */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="card-dark p-5 mb-6"
      >
        <div className="flex flex-col md:flex-row md:items-end gap-4">
          <div className="flex-1 relative">
            <label className="block text-sm text-text-secondary mb-2 font-medium">
              Select Analyses ({selectedIds.length}/5)
            </label>
            <button
              id="compare-analysis-picker"
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="input-dark w-full flex items-center justify-between"
            >
              <span className="text-text-secondary">
                {selectedIds.length === 0
                  ? 'Click to select analyses...'
                  : `${selectedIds.length} selected`}
              </span>
              <ChevronDown className={`w-4 h-4 text-text-muted transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown */}
            <AnimatePresence>
              {dropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="absolute z-40 left-0 right-0 mt-1 bg-dark-secondary border border-dark-border rounded-lg shadow-2xl max-h-80 overflow-hidden"
                >
                  <div className="p-2 border-b border-dark-border">
                    <div className="relative">
                      <Search className="w-4 h-4 absolute left-2 top-1/2 -translate-y-1/2 text-text-muted" />
                      <input
                        type="text"
                        value={searchFilter}
                        onChange={(e) => setSearchFilter(e.target.value)}
                        placeholder="Filter analyses..."
                        className="input-dark pl-8 py-1.5 text-sm"
                      />
                    </div>
                  </div>
                  <div className="overflow-y-auto max-h-60">
                    {filteredAnalyses.length === 0 ? (
                      <p className="p-3 text-sm text-text-muted text-center">No analyses found</p>
                    ) : (
                      filteredAnalyses.map((a) => {
                        const isSelected = selectedIds.includes(a.id);
                        const isDisabled = !isSelected && selectedIds.length >= 5;
                        return (
                          <button
                            key={a.id}
                            onClick={() => !isDisabled && toggleSelection(a.id)}
                            disabled={isDisabled}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 text-left text-sm transition-colors ${
                              isSelected
                                ? 'bg-cyber-cyan/10 text-cyber-cyan'
                                : isDisabled
                                  ? 'opacity-40 cursor-not-allowed text-text-muted'
                                  : 'text-text-secondary hover:bg-dark-tertiary hover:text-text-primary'
                            }`}
                          >
                            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                              isSelected ? 'bg-cyber-cyan border-cyber-cyan' : 'border-dark-border'
                            }`}>
                              {isSelected && <Check className="w-3 h-3 text-dark-primary" />}
                            </div>
                            <span className="flex-1 truncate">{a.title}</span>
                            <span className="text-xs text-text-muted">
                              Score: {a.total_risk_score?.toFixed(1)}
                            </span>
                          </button>
                        );
                      })
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            disabled={selectedIds.length < 2 || comparing}
            onClick={handleCompare}
            className="btn-cyber flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {comparing ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <BarChart3 className="w-5 h-5" />
            )}
            {comparing ? 'Comparing...' : 'Compare'}
          </motion.button>
        </div>

        {/* Selected tags */}
        {selectedIds.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {selectedIds.map((id) => {
              const a = analyses.find((x) => x.id === id);
              return (
                <motion.span
                  key={id}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyber-cyan/10 border border-cyber-cyan/30 text-cyber-cyan text-xs font-medium"
                >
                  {a?.title || `#${id}`}
                  <button onClick={() => toggleSelection(id)} className="hover:text-white">
                    <X className="w-3 h-3" />
                  </button>
                </motion.span>
              );
            })}
          </div>
        )}
      </motion.div>

      {/* Error */}
      {error && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="p-4 mb-6 bg-risk-critical/10 border border-risk-critical/30 rounded-lg text-risk-critical text-sm"
        >
          {error}
        </motion.div>
      )}

      {/* Comparison Results */}
      {comparison && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="card-dark p-5 text-center">
              <div className="text-3xl font-bold text-cyber-cyan mb-1">
                {comparison.analyses.length}
              </div>
              <div className="text-sm text-text-muted">Analyses Compared</div>
            </div>
            <div className="card-dark p-5 text-center">
              <div className="text-3xl font-bold text-purple-400 mb-1">
                {comparison.cross_analysis.common_threats.length}
              </div>
              <div className="text-sm text-text-muted">Common Threats</div>
            </div>
            <div className="card-dark p-5 text-center">
              <div className="text-3xl font-bold text-amber-400 mb-1">
                {comparison.cross_analysis.total_unique_components}
              </div>
              <div className="text-sm text-text-muted">Unique Components</div>
            </div>
          </div>

          {/* Risk Score Comparison Table */}
          <div className="card-dark overflow-hidden">
            <div className="p-4 border-b border-dark-border">
              <h2 className="text-lg font-semibold text-text-primary flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-cyber-cyan" />
                Risk Score Comparison
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-dark-tertiary/50">
                    <th className="text-left p-3 text-text-secondary font-medium">Metric</th>
                    {comparison.analyses.map((a, idx) => (
                      <th key={a.id} className="text-center p-3 font-medium" style={{ color: CHART_COLORS[idx] }}>
                        {a.title}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-border/50">
                  <tr className="hover:bg-dark-tertiary/30 transition-colors">
                    <td className="p-3 text-text-secondary">Total Risk Score</td>
                    {comparison.analyses.map((a) => (
                      <td key={a.id} className="p-3 text-center">
                        <span className="text-lg font-bold text-text-primary">{a.total_risk_score.toFixed(1)}</span>
                        <div className="mt-1"><RiskBadge level={getRiskBadgeLevel(a.total_risk_score)} size="small" /></div>
                      </td>
                    ))}
                  </tr>
                  <tr className="hover:bg-dark-tertiary/30 transition-colors">
                    <td className="p-3 text-text-secondary">Avg Risk Score</td>
                    {comparison.analyses.map((a) => (
                      <td key={a.id} className="p-3 text-center font-medium text-text-primary">
                        {a.average_risk_score.toFixed(1)}
                      </td>
                    ))}
                  </tr>
                  <tr className="hover:bg-dark-tertiary/30 transition-colors">
                    <td className="p-3 text-text-secondary">Max Risk Score</td>
                    {comparison.analyses.map((a) => (
                      <td key={a.id} className="p-3 text-center font-medium text-text-primary">
                        {a.max_risk_score.toFixed(1)}
                      </td>
                    ))}
                  </tr>
                  <tr className="hover:bg-dark-tertiary/30 transition-colors">
                    <td className="p-3 text-text-secondary">Total Threats</td>
                    {comparison.analyses.map((a) => (
                      <td key={a.id} className="p-3 text-center font-medium text-text-primary">
                        {a.threat_count}
                      </td>
                    ))}
                  </tr>
                  {['Critical', 'High', 'Medium', 'Low'].map((level) => (
                    <tr key={level} className="hover:bg-dark-tertiary/30 transition-colors">
                      <td className={`p-3 ${getRiskColor(level)}`}>{level}</td>
                      {comparison.analyses.map((a) => (
                        <td key={a.id} className={`p-3 text-center font-medium ${getRiskColor(level)}`}>
                          {a.risk_distribution[level] || 0}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Radar Chart */}
          <div className="card-dark p-5">
            <h2 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-cyber-cyan" />
              STRIDE Distribution Overlay
            </h2>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
                  <PolarGrid stroke="#30363d" />
                  <PolarAngleAxis dataKey="category" tick={{ fill: '#8b949e', fontSize: 12 }} />
                  <PolarRadiusAxis tick={{ fill: '#484f58', fontSize: 10 }} />
                  {comparison.analyses.map((a, idx) => (
                    <Radar
                      key={a.id}
                      name={a.title}
                      dataKey={a.title}
                      stroke={CHART_COLORS[idx]}
                      fill={CHART_COLORS[idx]}
                      fillOpacity={0.15}
                      strokeWidth={2}
                    />
                  ))}
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#161b22',
                      border: '1px solid #30363d',
                      borderRadius: '8px',
                      color: '#c9d1d9',
                    }}
                  />
                  <Legend
                    wrapperStyle={{ color: '#8b949e', fontSize: '12px' }}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Risk Trend */}
          {comparison.cross_analysis.risk_trend.length > 1 && (
            <div className="card-dark p-5">
              <h2 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
                Risk Trend Over Time
              </h2>
              <div className="flex items-center gap-4 overflow-x-auto pb-2">
                {comparison.cross_analysis.risk_trend.map((point, idx) => {
                  const prev = idx > 0 ? comparison.cross_analysis.risk_trend[idx - 1] : null;
                  const delta = prev ? point.total_risk_score - prev.total_risk_score : 0;
                  return (
                    <motion.div
                      key={point.analysis_id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      className="flex-shrink-0 card-dark p-4 min-w-[180px] border border-dark-border"
                    >
                      <div className="text-xs text-text-muted mb-1">
                        {new Date(point.created_at).toLocaleDateString()}
                      </div>
                      <div className="text-sm font-medium text-text-primary truncate mb-2">
                        {point.title}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xl font-bold text-cyber-cyan">
                          {point.total_risk_score.toFixed(1)}
                        </span>
                        {idx > 0 && (
                          <span className={`flex items-center gap-0.5 text-xs font-medium ${
                            delta > 0 ? 'text-red-400' : delta < 0 ? 'text-green-400' : 'text-text-muted'
                          }`}>
                            {delta > 0 ? <TrendingUp className="w-3 h-3" /> : delta < 0 ? <TrendingDown className="w-3 h-3" /> : null}
                            {delta > 0 ? '+' : ''}{delta.toFixed(1)}
                          </span>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Common Threats */}
          {comparison.cross_analysis.common_threats.length > 0 && (
            <div className="card-dark p-5">
              <h2 className="text-lg font-semibold text-text-primary mb-4">
                Common Threats Across Analyses
              </h2>
              <div className="flex flex-wrap gap-2">
                {comparison.cross_analysis.common_threats.map((name) => (
                  <span key={name} className="px-3 py-1.5 rounded-lg bg-purple-500/10 border border-purple-500/30 text-purple-400 text-sm">
                    {name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* STRIDE Category Breakdown */}
          <div className="card-dark overflow-hidden">
            <div className="p-4 border-b border-dark-border">
              <h2 className="text-lg font-semibold text-text-primary">
                Threats by STRIDE Category
              </h2>
            </div>
            {STRIDE_CATEGORIES.map((cat) => {
              const hasThreats = comparison.analyses.some(
                (a) => a.threats_by_stride[cat]?.length > 0
              );
              if (!hasThreats) return null;

              return (
                <div key={cat} className="border-b border-dark-border/50 last:border-b-0">
                  <div className="p-4 bg-dark-tertiary/30">
                    <h3 className="text-sm font-semibold text-text-primary uppercase tracking-wide">
                      {cat}
                    </h3>
                  </div>
                  <div className="overflow-x-auto">
                    <div className="flex divide-x divide-dark-border/50 min-w-max">
                      {comparison.analyses.map((a, idx) => (
                        <div key={a.id} className="flex-1 min-w-[280px] p-4">
                          <div className="text-xs font-medium mb-3" style={{ color: CHART_COLORS[idx] }}>
                            {a.title}
                          </div>
                          {a.threats_by_stride[cat]?.length === 0 ? (
                            <p className="text-xs text-text-muted italic">No threats</p>
                          ) : (
                            <div className="space-y-2">
                              {a.threats_by_stride[cat].map((threat) => (
                                <div key={threat.id} className="p-2.5 rounded-lg bg-dark-tertiary/50 border border-dark-border/30">
                                  <div className="flex items-start justify-between gap-2 mb-1">
                                    <span className="text-sm font-medium text-text-primary">{threat.name}</span>
                                    <RiskBadge level={threat.risk_level} size="small" showIcon={false} />
                                  </div>
                                  <p className="text-xs text-text-muted line-clamp-2">{threat.description}</p>
                                  <div className="flex gap-3 mt-1.5 text-xs text-text-muted">
                                    <span>L:{threat.likelihood} I:{threat.impact}</span>
                                    <span>Score: {threat.risk_score.toFixed(1)}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Empty state */}
      {!comparison && !comparing && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="card-dark p-12 text-center"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 mb-4 rounded-xl bg-dark-tertiary">
            <GitCompareArrows className="w-8 h-8 text-text-muted" />
          </div>
          <h3 className="text-lg font-medium text-text-primary mb-2">
            Select analyses to compare
          </h3>
          <p className="text-text-secondary">
            Choose 2–5 analyses from your history and click Compare to see a side-by-side breakdown.
          </p>
        </motion.div>
      )}
    </div>
  );
}
