import { Code, Download, ImageIcon, RefreshCw } from 'lucide-react';

export default function DiagramPanel({
  title,
  diagramFormat,
  diagramCode,
  diagramLoading,
  diagramError,
  diagramActionError,
  diagramSvgDataUrl,
  activeDiagramAction,
  isDiagramCodeExpanded,
  onToggleCode,
  onRetryRender,
  onDownloadSvg,
  onDownloadPng,
  onRefreshCache,
}) {
  const isActionInProgress = Boolean(activeDiagramAction);

  return (
    <div className="mt-6 p-4 rounded-lg border border-dark-border bg-dark-tertiary/60">
      <div className="flex flex-col gap-3 mb-3">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-medium text-text-secondary flex items-center gap-2">
            <ImageIcon className="w-4 h-4" />
            Diagram ({diagramFormat?.toUpperCase() || 'UML'})
          </h3>
          <button
            type="button"
            onClick={onToggleCode}
            className="text-xs text-cyber-cyan hover:text-cyber-cyan/80 transition-colors inline-flex items-center gap-1"
          >
            <Code className="w-3 h-3" />
            {isDiagramCodeExpanded ? 'Hide UML code' : 'Show UML code'}
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onDownloadSvg}
            disabled={isActionInProgress}
            className="btn-secondary text-xs px-3 py-1.5 inline-flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="w-3 h-3" />
            {activeDiagramAction === 'downloadSvg' ? 'Downloading SVG...' : 'Download SVG'}
          </button>
          <button
            type="button"
            onClick={onDownloadPng}
            disabled={isActionInProgress}
            className="btn-secondary text-xs px-3 py-1.5 inline-flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="w-3 h-3" />
            {activeDiagramAction === 'downloadPng' ? 'Downloading PNG...' : 'Download PNG'}
          </button>
          <button
            type="button"
            onClick={onRefreshCache}
            disabled={isActionInProgress}
            className="btn-secondary text-xs px-3 py-1.5 inline-flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className="w-3 h-3" />
            {activeDiagramAction === 'refreshCache' ? 'Refreshing...' : 'Refresh Render Cache'}
          </button>
        </div>
      </div>

      {diagramActionError && (
        <p className="text-sm text-risk-critical mb-3 p-2 rounded-md border border-risk-critical/30 bg-risk-critical/10">{diagramActionError}</p>
      )}

      {diagramLoading ? (
        <p className="text-sm text-text-secondary">Rendering diagram...</p>
      ) : diagramError ? (
        <div className="space-y-2">
          <p className="text-sm text-risk-critical">{diagramError}</p>
          <button
            type="button"
            onClick={onRetryRender}
            className="btn-secondary text-xs px-3 py-1.5"
          >
            Retry Diagram Render
          </button>
        </div>
      ) : diagramSvgDataUrl ? (
        <div className="rounded-lg border border-dark-border bg-dark-secondary p-3 overflow-auto">
          <img
            src={diagramSvgDataUrl}
            alt={`${title} UML diagram`}
            className="w-full h-auto"
          />
        </div>
      ) : (
        <p className="text-sm text-text-muted">Diagram preview unavailable.</p>
      )}

      {isDiagramCodeExpanded && diagramCode && (
        <div className="mt-3">
          <p className="text-xs text-text-muted mb-2">UML Code</p>
          <pre className="text-xs text-text-primary whitespace-pre-wrap bg-dark-secondary rounded-lg p-3 border border-dark-border overflow-auto max-h-64">
            {diagramCode}
          </pre>
        </div>
      )}
    </div>
  );
}
