import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
// eslint-disable-next-line no-unused-vars
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeft,
  BarChart3,
  Calendar,
  Check,
  ChevronDown,
  FolderKanban,
  GitCompareArrows,
  AlertTriangle,
  Loader2,
  Search,
  X,
} from 'lucide-react';

import LoadingSpinner from '../components/LoadingSpinner';
import RiskBadge from '../components/RiskBadge';
import { compareAnalyses, getAnalyses, getProject } from '../services/api';
import { getApiErrorMessage } from '../services/apiError';
import {
  ANALYSES_PAGE_SIZE,
  filterAnalysesByTitle,
  getRiskBadgeLevel,
  SEARCH_DEBOUNCE_MS,
} from './comparePageUtils';

const ComparisonResults = lazy(() => import('../components/compare/ComparisonResults'));

function formatAnalysisDate(value) {
  if (!value) return 'Date unavailable';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Date unavailable';
  return date.toLocaleDateString();
}

function formatRiskScore(score) {
  const numericScore = Number(score);
  if (Number.isNaN(numericScore)) return 'N/A';
  return numericScore.toFixed(1);
}

export default function ComparePage() {
  const [analyses, setAnalyses] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [selectedIds, setSelectedIds] = useState([]);
  const [comparison, setComparison] = useState(null);
  const [comparing, setComparing] = useState(false);
  const [error, setError] = useState(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');
  const [projectContext, setProjectContext] = useState(null);
  const [searchParams] = useSearchParams();
  const latestLoadRequestIdRef = useRef(0);
  const projectId = searchParams.get('project_id') || '';

  useEffect(() => {
    let isCancelled = false;
    const loadProjectContext = async () => {
      if (!projectId) {
        setProjectContext(null);
        return;
      }
      try {
        const project = await getProject(projectId);
        if (!isCancelled) {
          setProjectContext(project);
        }
      } catch (projectError) {
        if (!isCancelled) {
          console.error('Failed to load compare project context:', projectError);
          setProjectContext(null);
        }
      }
    };

    loadProjectContext();
    return () => {
      isCancelled = true;
    };
  }, [projectId]);

  // Load analyses for picker with backend-compatible pagination and stale-response protection.
  useEffect(() => {
    let isCancelled = false;
    const requestId = latestLoadRequestIdRef.current + 1;
    latestLoadRequestIdRef.current = requestId;

    const loadAnalyses = async () => {
      try {
        if (requestId === latestLoadRequestIdRef.current) {
          setError(null);
        }

        const nextAnalyses = [];
        let currentSkip = 0;
        let hasMore = true;

        while (hasMore) {
          if (isCancelled || requestId !== latestLoadRequestIdRef.current) {
            if (import.meta.env.DEV) {
              console.debug('compare.load_analyses.abort_stale', { requestId, currentSkip });
            }
            return;
          }

          const analysisParams = {
            skip: currentSkip,
            limit: ANALYSES_PAGE_SIZE,
            q: searchFilter || undefined,
          };
          if (projectId) {
            analysisParams.project_id = Number(projectId);
          }
          const page = await getAnalyses(analysisParams);

          const pageItems = page.items || [];
          nextAnalyses.push(...pageItems);
          hasMore = Boolean(page.has_more);

          if (import.meta.env.DEV) {
            console.debug('compare.load_analyses.page', {
              requestId,
              skip: currentSkip,
              received: pageItems.length,
              hasMore,
            });
          }

          if (!hasMore) {
            break;
          }
          if (pageItems.length === 0) {
            if (import.meta.env.DEV) {
              console.debug('compare.load_analyses.guard_stop', {
                requestId,
                reason: 'has_more true with zero items',
              });
            }
            break;
          }

          currentSkip += pageItems.length;
        }

        if (isCancelled || requestId !== latestLoadRequestIdRef.current) {
          if (import.meta.env.DEV) {
            console.debug('compare.load_analyses.stale_ignored', { requestId });
          }
          return;
        }

        setAnalyses(nextAnalyses);
        setError(null);
      } catch (err) {
        if (isCancelled || requestId !== latestLoadRequestIdRef.current) {
          return;
        }
        setError(getApiErrorMessage(err, {
          fallbackMessage: 'Failed to load analyses',
          operation: 'compare.load_analyses',
        }));
        setAnalyses([]);
      } finally {
        if (!isCancelled && requestId === latestLoadRequestIdRef.current) {
          setLoadingList(false);
        }
      }
    };

    const debounceTimer = setTimeout(
      loadAnalyses,
      searchFilter ? SEARCH_DEBOUNCE_MS : 0,
    );
    return () => {
      isCancelled = true;
      clearTimeout(debounceTimer);
    };
  }, [searchFilter, projectId]);

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
      setError(getApiErrorMessage(err, {
        fallbackMessage: 'Comparison failed',
        operation: 'compare.run',
      }));
    } finally {
      setComparing(false);
    }
  };

  const filteredAnalyses = filterAnalysesByTitle(analyses, searchFilter);

  if (loadingList) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <LoadingSpinner text="Loading analyses..." />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="ui-page-header"
      >
        <div>
          <p className="page-kicker">Decision Support</p>
          <h1 className="page-title flex items-center gap-3">
            <GitCompareArrows className="w-8 h-8 text-cyber-cyan" />
            {projectContext ? `Compare ${projectContext.name}` : 'Compare Analyses'}
          </h1>
          <p className="page-subtitle">
            {projectContext
              ? 'Select 2–5 analyses from this project to compare side-by-side'
              : 'Select 2–5 analyses to compare side-by-side'}
          </p>
        </div>
        <Link to={projectContext ? `/projects/${projectContext.id}` : '/history'}>
          <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.98 }} className="btn-secondary flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" />
            {projectContext ? 'Back to Project' : 'Back to History'}
          </motion.button>
        </Link>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="ui-panel mb-6"
      >
        <div className="flex flex-col md:flex-row md:items-end gap-4">
          <div className="flex-1 relative">
            <p className="block text-sm text-text-secondary mb-2 font-medium">
              Select Analyses ({selectedIds.length}/5)
            </p>
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
                            className={`w-full flex items-start gap-3 px-3 py-3 text-left text-sm transition-colors ${
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
                            <span className="min-w-0 flex-1">
                              <span className="block truncate font-medium text-text-primary">{a.title}</span>
                              <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-muted">
                                <span className="inline-flex items-center gap-1">
                                  <FolderKanban className="h-3 w-3" />
                                  {a.project?.name || 'Unassigned project'}
                                </span>
                                <span className="inline-flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  {formatAnalysisDate(a.created_at)}
                                </span>
                                {a.threat_count !== undefined && (
                                  <span className="inline-flex items-center gap-1">
                                    <AlertTriangle className="h-3 w-3" />
                                    {a.threat_count} threats
                                  </span>
                                )}
                                {a.high_risk_count > 0 && (
                                  <span className="text-risk-critical">
                                    {a.high_risk_count} high/critical
                                  </span>
                                )}
                              </span>
                            </span>
                            <span className="flex flex-shrink-0 flex-col items-end gap-1 text-xs text-text-muted">
                              <span>Score {formatRiskScore(a.total_risk_score)}</span>
                              {a.total_risk_score !== undefined && (
                                <RiskBadge
                                  level={getRiskBadgeLevel(Number(a.total_risk_score || 0))}
                                  showIcon={false}
                                  size="small"
                                />
                              )}
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
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.98 }}
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

        {selectedIds.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-dark-border">
            {selectedIds.map((id) => {
              const a = analyses.find((x) => x.id === id);
              return (
                <motion.span
                  key={id}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-dark-tertiary border border-dark-border text-text-secondary text-xs font-medium"
                >
                  {a?.title || `#${id}`}
                  <button onClick={() => toggleSelection(id)} className="hover:text-text-primary" aria-label={`Remove ${a?.title || id}`}>
                    <X className="w-3 h-3" />
                  </button>
                </motion.span>
              );
            })}
          </div>
        )}
      </motion.div>

      {error && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="ui-alert error mb-6"
        >
          {error}
        </motion.div>
      )}

      {comparison && (
        <Suspense fallback={<LoadingSpinner text="Loading comparison visualizations..." />}>
          <ComparisonResults comparison={comparison} />
        </Suspense>
      )}

      {!comparison && !comparing && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="ui-empty-state p-12"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 mb-4 rounded-xl bg-dark-tertiary border border-dark-border">
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
