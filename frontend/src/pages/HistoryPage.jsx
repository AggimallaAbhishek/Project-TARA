import LoadingSpinner from '../components/LoadingSpinner';
import HistoryDeleteModal from '../components/history/HistoryDeleteModal';
import HistoryEmptyState from '../components/history/HistoryEmptyState';
import HistoryFiltersPanel from '../components/history/HistoryFiltersPanel';
import HistoryHeader from '../components/history/HistoryHeader';
import HistoryPaginationBar from '../components/history/HistoryPaginationBar';
import HistoryResultsList from '../components/history/HistoryResultsList';
import useHistoryData from '../hooks/history/useHistoryData';
import useHistoryFilters from '../hooks/history/useHistoryFilters';
import { deleteAnalysis, getAnalyses, getProjects } from '../services/api';
import { getApiErrorMessage } from '../services/apiError';

export default function HistoryPage() {
  const {
    searchInput,
    setSearchInput,
    riskFilter,
    strideFilter,
    projectFilter,
    dateFrom,
    dateTo,
    skip,
    setSkip,
    limit,
    analysesQuery,
    hasFiltersApplied,
    applySearch,
    resetFilters,
    updateRiskFilter,
    updateStrideFilter,
    updateProjectFilter,
    updateDateFrom,
    updateDateTo,
    updatePageSize,
  } = useHistoryFilters();

  const {
    analyses,
    projects,
    total,
    hasMore,
    loading,
    error,
    actionError,
    deleteConfirm,
    requestDelete,
    cancelDelete,
    confirmDelete,
  } = useHistoryData({
    analysesQuery,
    skip,
    limit,
    setSkip,
    getAnalyses,
    getProjects,
    deleteAnalysis,
    getApiErrorMessage,
  });

  const currentPage = Math.floor(skip / limit) + 1;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const pageStart = total === 0 ? 0 : skip + 1;
  const pageEnd = skip + analyses.length;

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
      <HistoryHeader total={total} />

      <HistoryFiltersPanel
        searchInput={searchInput}
        onSearchInputChange={setSearchInput}
        onApplySearch={applySearch}
        riskFilter={riskFilter}
        onRiskFilterChange={updateRiskFilter}
        strideFilter={strideFilter}
        onStrideFilterChange={updateStrideFilter}
        projectFilter={projectFilter}
        onProjectFilterChange={updateProjectFilter}
        dateFrom={dateFrom}
        onDateFromChange={updateDateFrom}
        dateTo={dateTo}
        onDateToChange={updateDateTo}
        projects={projects}
        limit={limit}
        onLimitChange={updatePageSize}
        hasFiltersApplied={hasFiltersApplied}
        onResetFilters={resetFilters}
        pageStart={pageStart}
        pageEnd={pageEnd}
        total={total}
      />

      {analyses.length === 0 ? (
        <HistoryEmptyState hasFiltersApplied={hasFiltersApplied} />
      ) : (
        <div className="space-y-4">
          <HistoryResultsList analyses={analyses} actionError={actionError} onRequestDelete={requestDelete} />
          <HistoryPaginationBar
            skip={skip}
            limit={limit}
            hasMore={hasMore}
            currentPage={currentPage}
            totalPages={totalPages}
            onPrevious={setSkip}
            onNext={setSkip}
          />
        </div>
      )}

      <HistoryDeleteModal
        deleteConfirm={deleteConfirm}
        onCancel={cancelDelete}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
