import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function HistoryPaginationBar({
  skip,
  limit,
  hasMore,
  currentPage,
  totalPages,
  onPrevious,
  onNext,
}) {
  return (
    <div className="section-card p-4 flex items-center justify-between">
      <button
        type="button"
        onClick={() => onPrevious(Math.max(0, skip - limit))}
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
        onClick={() => onNext(skip + limit)}
        disabled={!hasMore}
        className="btn-secondary inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Next
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}
