import { Link } from 'react-router-dom';
/* eslint-disable-next-line no-unused-vars */
import { motion } from 'framer-motion';
import {
  Clock,
  Download,
  FileText,
  TrendingUp,
} from 'lucide-react';

import DiagramPanel from './DiagramPanel';

export default function AnalysisHeaderCard({
  analysis,
  totalThreatCount,
  highRiskCount,
  isDownloadingPdf,
  pdfError,
  onDownloadPdf,
  diagramLoading,
  diagramError,
  diagramSvgDataUrl,
  isDiagramCodeExpanded,
  diagramActionError,
  activeDiagramAction,
  onToggleDiagramCode,
  onRetryDiagramRender,
  onDownloadDiagramSvg,
  onDownloadDiagramPng,
  onRefreshDiagramCache,
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="card-dark p-6 mb-6"
    >
      <div className="flex justify-end mb-4">
        <button
          type="button"
          onClick={onDownloadPdf}
          disabled={isDownloadingPdf}
          className="btn-secondary inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Download className="w-4 h-4" />
          {isDownloadingPdf ? 'Downloading...' : 'Download PDF Report'}
        </button>
      </div>
      {pdfError && (
        <div className="mb-4 p-3 bg-risk-critical/10 border border-risk-critical/30 rounded-lg text-sm text-risk-critical">
          {pdfError}
        </div>
      )}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div className="flex-1">
          <h1 className="text-2xl font-bold font-display text-text-primary mb-2">
            {analysis.title}
          </h1>
          {analysis.project && (
            <Link
              to={`/projects/${analysis.project.id}`}
              className="inline-flex items-center px-2 py-1 mb-3 rounded-full bg-cyber-cyan/10 border border-cyber-cyan/20 text-cyber-cyan text-xs hover:bg-cyber-cyan/20 transition-colors"
            >
              Project: {analysis.project.name}
            </Link>
          )}
          <div className="flex flex-wrap items-center gap-4 text-sm text-text-secondary">
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {new Date(analysis.created_at).toLocaleString()}
            </span>
            {analysis.analysis_time > 0 && (
              <span className="flex items-center gap-1 text-cyber-cyan">
                <TrendingUp className="w-4 h-4" />
                Analyzed in {analysis.analysis_time.toFixed(1)}s
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-center px-4 py-2 bg-dark-tertiary rounded-lg">
            <div className="text-3xl font-bold text-cyber-cyan">
              {analysis.total_risk_score.toFixed(1)}
            </div>
            <div className="text-xs text-text-muted">Avg Risk Score</div>
          </div>
          <div className="text-center px-4 py-2 bg-dark-tertiary rounded-lg">
            <div className="text-3xl font-bold text-text-primary">
              {totalThreatCount}
            </div>
            <div className="text-xs text-text-muted">Threats Found</div>
          </div>
          {highRiskCount > 0 && (
            <div className="text-center px-4 py-2 bg-risk-critical/10 border border-risk-critical/30 rounded-lg">
              <div className="text-3xl font-bold text-risk-critical">
                {highRiskCount}
              </div>
              <div className="text-xs text-risk-critical">High/Critical</div>
            </div>
          )}
        </div>
      </div>

      {analysis.has_diagram && (
        <DiagramPanel
          title={analysis.title}
          diagramFormat={analysis.diagram_format}
          diagramCode={analysis.diagram_code}
          diagramLoading={diagramLoading}
          diagramError={diagramError}
          diagramSvgDataUrl={diagramSvgDataUrl}
          isDiagramCodeExpanded={isDiagramCodeExpanded}
          diagramActionError={diagramActionError}
          activeDiagramAction={activeDiagramAction}
          onToggleCode={onToggleDiagramCode}
          onRetryRender={onRetryDiagramRender}
          onDownloadSvg={onDownloadDiagramSvg}
          onDownloadPng={onDownloadDiagramPng}
          onRefreshCache={onRefreshDiagramCache}
        />
      )}

      <div className="mt-6 p-4 bg-dark-tertiary rounded-lg">
        <h3 className="text-sm font-medium text-text-secondary mb-2 flex items-center gap-2">
          <FileText className="w-4 h-4" />
          System Description
        </h3>
        <p className="text-sm text-text-primary whitespace-pre-wrap">
          {analysis.system_description}
        </p>
      </div>
    </motion.div>
  );
}
