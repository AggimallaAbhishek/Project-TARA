import React from 'react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
// motion is used in JSX as motion.div
// eslint-disable-next-line no-unused-vars
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertTriangle,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  Eye,
  FileSearch,
  Plus,
  RotateCcw,
  Search,
  Trash2,
} from 'lucide-react';

import LoadingSpinner from '../components/LoadingSpinner';
import RiskBadge from '../components/RiskBadge';
import { deleteAnalysis, getAnalyses } from '../services/api';

const RISK_FILTER_OPTIONS = ['Low', 'Medium', 'High', 'Critical'];
const STRIDE_FILTER_OPTIONS = [
  'Spoofing',
  'Tampering',
  'Repudiation',
  'Information Disclosure',
  'Denial of Service',
  'Elevation of Privilege',
];

export default function HistoryPage() {
  const [analyses, setAnalyses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [riskFilter, setRiskFilter] = useState('all');
  const [strideFilter, setStrideFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const [skip, setSkip] = useState(0);
  const [limit, setLimit] = useState(20);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const loadAnalyses = async () => {
      try {
        setLoading(true);
        const data = await getAnalyses({
          skip,
          limit,
          q: searchQuery,
          risk_level: riskFilter === 'all' ? '' : riskFilter,
          stride_category: strideFilter === 'all' ? '' : strideFilter,
          date_from: dateFrom,
          date_to: dateTo,
        });
        setAnalyses(data.items || []);
        setTotal(data.total || 0);
        setHasMore(Boolean(data.has_more));
        setError(null);
      } catch (err) {
        setError(err.response?.data?.detail || 'Failed to load analyses');
      } finally {
        setLoading(false);
      }
    };

    loadAnalyses();
  }, [skip, limit, searchQuery, riskFilter, strideFilter, dateFrom, dateTo, refreshKey]);

  const handleSearchApply = (e) => {
    e.preventDefault();
    setSkip(0);
    setSearchQuery(searchInput.trim());
  };

  const handleResetFilters = () => {
    setSearchInput('');
    setSearchQuery('');
    setRiskFilter('all');
    setStrideFilter('all');
    setDateFrom('');
    setDateTo('');
    setSkip(0);
  };

  const handleDelete = async (id) => {
    try {
      await deleteAnalysis(id);
      setDeleteConfirm(null);
      setActionError(null);
      if (analyses.length === 1 && skip > 0) {
        setSkip(Math.max(0, skip - limit));
      } else {
        setRefreshKey((value) => value + 1);
      }
    } catch (deleteError) {
      console.error('Failed to delete analysis:', deleteError);
      setActionError(deleteError.response?.data?.detail || 'Failed to delete analysis');
    }
  };

  const getRiskBadgeLevel = (score) => {
    if (score >= 16) return 'Critical';
    if (score >= 10) return 'High';
    if (score >= 5) return 'Medium';
    return 'Low';
  };

  const currentPage = Math.floor(skip / limit) + 1;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const pageStart = total === 0 ? 0 : skip + 1;
  const pageEnd = skip + analyses.length;
  const hasFiltersApplied =
    Boolean(searchQuery) || riskFilter !== 'all' || strideFilter !== 'all' || Boolean(dateFrom) || Boolean(dateTo);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <LoadingSpinner text="Loading history..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-risk-critical text-lg">{error}</div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-between items-center mb-8"
      >
        <div>
          <h1 className="text-3xl font-bold font-display text-text-primary">Analysis History</h1>
          <p className="text-text-secondary mt-1">
            {total} {total === 1 ? 'analysis' : 'analyses'} found
          </p>
        </div>
        <Link to="/">
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="btn-cyber flex items-center gap-2">
            <Plus className="w-5 h-5" />
            New Analysis
          </motion.button>
        </Link>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="card-dark p-4 mb-6 space-y-4"
      >
        <form onSubmit={handleSearchApply} className="flex flex-col md:flex-row gap-3">
          <label className="sr-only" htmlFor="analysis-search">
            Search analyses
          </label>
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              id="analysis-search"
              type="text"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Search by title"
              className="input-dark pl-9"
            />
          </div>
          <button type="submit" className="btn-secondary">
            Apply Search
          </button>
        </form>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label htmlFor="history-risk-filter" className="block text-xs text-text-secondary mb-1">
              Risk Level
            </label>
            <select
              id="history-risk-filter"
              value={riskFilter}
              onChange={(event) => {
                setRiskFilter(event.target.value);
                setSkip(0);
              }}
              className="input-dark"
            >
              <option value="all">All</option>
              {RISK_FILTER_OPTIONS.map((riskLevel) => (
                <option key={riskLevel} value={riskLevel}>
                  {riskLevel}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="history-stride-filter" className="block text-xs text-text-secondary mb-1">
              STRIDE Category
            </label>
            <select
              id="history-stride-filter"
              value={strideFilter}
              onChange={(event) => {
                setStrideFilter(event.target.value);
                setSkip(0);
              }}
              className="input-dark"
            >
              <option value="all">All</option>
              {STRIDE_FILTER_OPTIONS.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="history-date-from" className="block text-xs text-text-secondary mb-1">
              Date From
            </label>
            <input
              id="history-date-from"
              type="date"
              value={dateFrom}
              onChange={(event) => {
                setDateFrom(event.target.value);
                setSkip(0);
              }}
              className="input-dark"
            />
          </div>

          <div>
            <label htmlFor="history-date-to" className="block text-xs text-text-secondary mb-1">
              Date To
            </label>
            <input
              id="history-date-to"
              type="date"
              value={dateTo}
              onChange={(event) => {
                setDateTo(event.target.value);
                setSkip(0);
              }}
              className="input-dark"
            />
          </div>
        </div>

        <div className="flex items-center justify-between gap-3">
          <div className="text-xs text-text-muted">
            Showing {pageStart}-{pageEnd} of {total}
          </div>
          <div className="flex items-center gap-3">
            <label htmlFor="history-page-size" className="text-xs text-text-secondary">
              Per page
            </label>
            <select
                id="history-page-size"
                value={limit}
                onChange={(event) => {
                  setLimit(Number(event.target.value));
                  setSkip(0);
                }}
                className="input-dark py-1 px-2 text-xs"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            <button
              type="button"
              onClick={handleResetFilters}
              className="btn-secondary inline-flex items-center gap-2"
              disabled={!hasFiltersApplied}
            >
              <RotateCcw className="w-4 h-4" />
              Reset Filters
            </button>
          </div>
        </div>
      </motion.div>

      {analyses.length === 0 ? (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="card-dark p-12 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 mb-4 rounded-xl bg-dark-tertiary">
            <FileSearch className="w-8 h-8 text-text-muted" />
          </div>
          <h3 className="text-lg font-medium text-text-primary mb-2">
            {hasFiltersApplied ? 'No analyses match these filters' : 'No analyses yet'}
          </h3>
          <p className="text-text-secondary mb-6">
            {hasFiltersApplied ? 'Try adjusting search and filter criteria.' : 'Start by analyzing your first system architecture.'}
          </p>
          <Link to="/">
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="btn-cyber inline-flex items-center gap-2">
              <Plus className="w-5 h-5" />
              Create Analysis
            </motion.button>
          </Link>
        </motion.div>
      ) : (
        <div className="space-y-4">
          {actionError && (
            <div className="p-3 bg-risk-critical/10 border border-risk-critical/30 rounded-lg text-sm text-risk-critical">
              {actionError}
            </div>
          )}
          <AnimatePresence>
            {analyses.map((analysis, index) => (
              <motion.div
                key={analysis.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -100 }}
                transition={{ delay: index * 0.05 }}
                className="card-dark p-5 hover:border-cyber-cyan/30 transition-colors"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <Link
                      to={`/analysis/${analysis.id}`}
                      className="text-lg font-semibold text-text-primary hover:text-cyber-cyan transition-colors truncate block"
                    >
                      {analysis.title}
                    </Link>
                    <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-text-secondary">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {new Date(analysis.created_at).toLocaleDateString()}
                      </span>
                      {analysis.analysis_time > 0 && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {analysis.analysis_time.toFixed(1)}s
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <AlertTriangle className="w-4 h-4" />
                        {analysis.threat_count} threats
                        {analysis.high_risk_count > 0 && (
                          <span className="text-risk-critical">({analysis.high_risk_count} high/critical)</span>
                        )}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-3">
                      <div className="text-center px-3 py-1 bg-dark-tertiary rounded-lg">
                        <div className="text-lg font-bold text-cyber-cyan">{analysis.total_risk_score.toFixed(1)}</div>
                        <div className="text-xs text-text-muted">Score</div>
                      </div>
                      <RiskBadge level={getRiskBadgeLevel(analysis.total_risk_score)} showIcon={false} size="small" />
                    </div>

                    <div className="flex items-center gap-2">
                      <Link to={`/analysis/${analysis.id}`}>
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          aria-label={`View analysis ${analysis.title}`}
                          className="p-2 rounded-lg bg-dark-tertiary text-text-secondary hover:text-cyber-cyan transition-colors"
                        >
                          <Eye className="w-5 h-5" />
                        </motion.button>
                      </Link>
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => setDeleteConfirm(analysis)}
                        aria-label={`Delete analysis ${analysis.title}`}
                        className="p-2 rounded-lg bg-dark-tertiary text-text-secondary hover:text-risk-critical transition-colors"
                      >
                        <Trash2 className="w-5 h-5" />
                      </motion.button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          <div className="card-dark p-4 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setSkip(Math.max(0, skip - limit))}
              disabled={skip === 0}
              className="btn-secondary inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </button>
            <div className="text-sm text-text-secondary">
              Page {currentPage} of {totalPages}
            </div>
            <button
              type="button"
              onClick={() => setSkip(skip + limit)}
              disabled={!hasMore}
              className="btn-secondary inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <AnimatePresence>
        {deleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-dark-primary/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setDeleteConfirm(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="card-dark p-6 max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-semibold text-text-primary mb-2">Delete Analysis?</h3>
              <p className="text-text-secondary mb-6">
                Are you sure you want to delete "{deleteConfirm.title}"? This action cannot be undone.
              </p>
              <div className="flex gap-3 justify-end">
                <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setDeleteConfirm(null)} className="btn-secondary">
                  Cancel
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleDelete(deleteConfirm.id)}
                  className="px-4 py-2 bg-risk-critical text-white font-medium rounded-lg hover:bg-risk-critical/80 transition-colors"
                >
                  Delete
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
