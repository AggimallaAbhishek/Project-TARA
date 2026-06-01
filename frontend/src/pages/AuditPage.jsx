import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
/* eslint-disable-next-line no-unused-vars */
import { motion } from 'framer-motion';
import { CalendarClock, FileSearch, Filter, RefreshCcw } from 'lucide-react';

import LoadingSpinner from '../components/LoadingSpinner';
import { getAuditLogs } from '../services/api';
import { getApiErrorMessage } from '../services/apiError';

const ACTION_OPTIONS = [
  'analysis_created',
  'analysis_deleted',
  'comparison_created',
  'pdf_exported',
  'project_created',
  'project_updated',
];

const ACTION_LABELS = {
  analysis_created: 'Analysis created',
  analysis_deleted: 'Analysis deleted',
  comparison_created: 'Comparison created',
  pdf_exported: 'PDF exported',
  project_created: 'Project created',
  project_updated: 'Project updated',
};

function formatMetadata(value) {
  if (!value || typeof value !== 'object') {
    return '';
  }
  try {
    const serialized = JSON.stringify(value);
    if (serialized.length <= 160) {
      return serialized;
    }
    return `${serialized.slice(0, 157)}...`;
  } catch {
    return '';
  }
}

export default function AuditPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [actionInput, setActionInput] = useState('all');
  const [analysisIdInput, setAnalysisIdInput] = useState('');
  const [projectIdInput, setProjectIdInput] = useState('');

  const [appliedFilters, setAppliedFilters] = useState({
    action: 'all',
    analysis_id: '',
    project_id: '',
  });
  const [skip, setSkip] = useState(0);
  const [limit, setLimit] = useState(50);
  const [hasMore, setHasMore] = useState(false);

  const pageStart = logs.length === 0 ? 0 : skip + 1;
  const pageEnd = skip + logs.length;
  const currentPage = Math.floor(skip / limit) + 1;

  const hasFiltersApplied = useMemo(
    () =>
      appliedFilters.action !== 'all'
      || Boolean(appliedFilters.analysis_id)
      || Boolean(appliedFilters.project_id),
    [appliedFilters],
  );

  useEffect(() => {
    let isMounted = true;
    const fetchAuditLogs = async () => {
      setLoading(true);
      try {
        const data = await getAuditLogs({
          ...appliedFilters,
          skip,
          limit,
        });
        if (!isMounted) return;
        setLogs(data || []);
        setHasMore((data || []).length >= limit);
        setError('');
      } catch (fetchError) {
        if (!isMounted) return;
        setError(getApiErrorMessage(fetchError, {
          fallbackMessage: 'Failed to load audit logs',
          operation: 'audit.list',
        }));
        setLogs([]);
        setHasMore(false);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchAuditLogs();
    return () => {
      isMounted = false;
    };
  }, [appliedFilters, skip, limit]);

  const handleApplyFilters = (event) => {
    event.preventDefault();
    setSkip(0);
    setAppliedFilters({
      action: actionInput || 'all',
      analysis_id: analysisIdInput.trim(),
      project_id: projectIdInput.trim(),
    });
  };

  const handleResetFilters = () => {
    setActionInput('all');
    setAnalysisIdInput('');
    setProjectIdInput('');
    setSkip(0);
    setAppliedFilters({
      action: 'all',
      analysis_id: '',
      project_id: '',
    });
  };

  if (loading && logs.length === 0) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <LoadingSpinner text="Loading audit logs..." />
      </div>
    );
  }

  if (error && logs.length === 0) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-risk-critical text-lg">{error}</div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="page-header"
      >
        <div>
          <p className="page-kicker">Governance</p>
          <h1 className="page-title">Audit Logs</h1>
          <p className="page-subtitle">
            Review immutable security and activity events across your workspace.
          </p>
        </div>
      </motion.div>

      <form onSubmit={handleApplyFilters} className="ui-filter-bar mb-6">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label htmlFor="audit-action-filter" className="block text-xs text-text-secondary mb-1">
              Action
            </label>
            <select
              id="audit-action-filter"
              value={actionInput}
              onChange={(event) => setActionInput(event.target.value)}
              className="input-dark"
            >
              <option value="all">All</option>
              {ACTION_OPTIONS.map((action) => (
                <option key={action} value={action}>
                  {ACTION_LABELS[action] || action}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="audit-analysis-id" className="block text-xs text-text-secondary mb-1">
              Analysis ID
            </label>
            <input
              id="audit-analysis-id"
              type="number"
              min="1"
              value={analysisIdInput}
              onChange={(event) => setAnalysisIdInput(event.target.value)}
              placeholder="e.g., 42"
              className="input-dark"
            />
          </div>
          <div>
            <label htmlFor="audit-project-id" className="block text-xs text-text-secondary mb-1">
              Project ID
            </label>
            <input
              id="audit-project-id"
              type="number"
              min="1"
              value={projectIdInput}
              onChange={(event) => setProjectIdInput(event.target.value)}
              placeholder="e.g., 7"
              className="input-dark"
            />
          </div>
          <div>
            <label htmlFor="audit-limit" className="block text-xs text-text-secondary mb-1">
              Per page
            </label>
            <select
              id="audit-limit"
              value={limit}
              onChange={(event) => {
                setSkip(0);
                setLimit(Number(event.target.value));
              }}
              className="input-dark"
            >
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <button type="submit" className="btn-secondary inline-flex items-center gap-2">
            <Filter className="w-4 h-4" />
            Apply Filters
          </button>
          <button
            type="button"
            disabled={!hasFiltersApplied}
            onClick={handleResetFilters}
            className="btn-secondary inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCcw className="w-4 h-4" />
            Reset
          </button>
        </div>

        <div className="text-xs text-text-muted">
          Showing {pageStart}-{pageEnd} · Page {currentPage}
        </div>
      </form>

      {error && (
        <div className="ui-alert error mb-6">
          {error}
        </div>
      )}

      {logs.length === 0 ? (
        <div className="ui-empty-state p-10">
          <FileSearch className="w-10 h-10 text-text-muted mx-auto mb-3" />
          <h2 className="text-xl font-semibold text-text-primary mb-2">No audit events found</h2>
          <p className="text-text-secondary">
            Try adjusting filters or return later after more activity is recorded.
          </p>
        </div>
      ) : (
        <div className="ui-data-list">
          {logs.map((event) => {
            const metadataText = formatMetadata(event.event_metadata);
            return (
              <div key={event.id} className="ui-panel p-4">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-text-primary">
                      {ACTION_LABELS[event.action] || event.action}
                    </p>
                    <p className="text-xs text-text-muted mt-1 inline-flex items-center gap-1">
                      <CalendarClock className="w-3.5 h-3.5" />
                      {new Date(event.created_at).toLocaleString()}
                    </p>
                    <div className="mt-2 text-xs text-text-secondary flex flex-wrap gap-2">
                      {event.project_id ? (
                        <Link to={`/projects/${event.project_id}`} className="hover:text-cyber-cyan">
                          Project #{event.project_id}
                        </Link>
                      ) : (
                        <span>Project: n/a</span>
                      )}
                      {event.analysis_id ? (
                        <Link to={`/analysis/${event.analysis_id}`} className="hover:text-cyber-cyan">
                          Analysis #{event.analysis_id}
                        </Link>
                      ) : (
                        <span>Analysis: n/a</span>
                      )}
                    </div>
                  </div>
                </div>
                {metadataText && (
                  <pre className="mt-3 text-xs text-text-muted whitespace-pre-wrap break-all rounded-lg border border-dark-border bg-dark-tertiary/60 p-2">
                    {metadataText}
                  </pre>
                )}
              </div>
            );
          })}

          <div className="ui-panel p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="text-xs text-text-muted">
              Showing {pageStart}-{pageEnd} · Page {currentPage}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={skip === 0 || loading}
                onClick={() => setSkip((value) => Math.max(0, value - limit))}
                className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={!hasMore || loading}
                onClick={() => setSkip((value) => value + limit)}
                className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
