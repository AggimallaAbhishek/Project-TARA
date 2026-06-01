/* eslint-disable-next-line no-unused-vars */
import { motion } from 'framer-motion';
import { RotateCcw, Search } from 'lucide-react';

const RISK_FILTER_OPTIONS = ['Low', 'Medium', 'High', 'Critical'];
const STRIDE_FILTER_OPTIONS = [
  'Spoofing',
  'Tampering',
  'Repudiation',
  'Information Disclosure',
  'Denial of Service',
  'Elevation of Privilege',
];

export default function HistoryFiltersPanel({
  searchInput,
  onSearchInputChange,
  onApplySearch,
  riskFilter,
  onRiskFilterChange,
  strideFilter,
  onStrideFilterChange,
  projectFilter,
  onProjectFilterChange,
  dateFrom,
  onDateFromChange,
  dateTo,
  onDateToChange,
  projects,
  limit,
  onLimitChange,
  hasFiltersApplied,
  onResetFilters,
  pageStart,
  pageEnd,
  total,
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="section-card mb-6 space-y-4"
    >
      <form onSubmit={onApplySearch} className="flex flex-col md:flex-row gap-3">
        <label className="sr-only" htmlFor="analysis-search">
          Search analyses
        </label>
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            id="analysis-search"
            type="text"
            value={searchInput}
            onChange={(event) => onSearchInputChange(event.target.value)}
            placeholder="Search by title"
            className="input-dark pl-9"
          />
        </div>
        <button type="submit" className="btn-secondary">
          Apply Search
        </button>
      </form>

      <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <div>
          <label htmlFor="history-project-filter" className="block text-xs text-text-secondary mb-1">
            Project
          </label>
          <select
            id="history-project-filter"
            value={projectFilter}
            onChange={(event) => onProjectFilterChange(event.target.value)}
            className="input-dark"
          >
            <option value="all">All</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="history-risk-filter" className="block text-xs text-text-secondary mb-1">
            Risk Level
          </label>
          <select
            id="history-risk-filter"
            value={riskFilter}
            onChange={(event) => onRiskFilterChange(event.target.value)}
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
            onChange={(event) => onStrideFilterChange(event.target.value)}
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
            onChange={(event) => onDateFromChange(event.target.value)}
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
            onChange={(event) => onDateToChange(event.target.value)}
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
            onChange={(event) => onLimitChange(event.target.value)}
            className="input-dark py-1 px-2 text-xs"
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
          </select>
          <button
            type="button"
            onClick={onResetFilters}
            className="btn-secondary inline-flex items-center gap-2"
            disabled={!hasFiltersApplied}
          >
            <RotateCcw className="w-4 h-4" />
            Reset Filters
          </button>
        </div>
      </div>
    </motion.div>
  );
}
