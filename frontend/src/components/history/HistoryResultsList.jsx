import { Link } from 'react-router-dom';
/* eslint-disable-next-line no-unused-vars */
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertTriangle,
  Calendar,
  Clock,
  Eye,
  FolderKanban,
  Trash2,
} from 'lucide-react';
import RiskBadge from '../RiskBadge';

function getRiskBadgeLevel(score) {
  if (score >= 16) return 'Critical';
  if (score >= 10) return 'High';
  if (score >= 5) return 'Medium';
  return 'Low';
}

export default function HistoryResultsList({ analyses, actionError, onRequestDelete }) {
  return (
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
            className="section-card py-5 hover:border-dark-border-strong transition-colors"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <Link
                  to={`/analysis/${analysis.id}`}
                  className="text-lg font-semibold text-text-primary hover:text-cyber-cyan transition-colors truncate block"
                >
                  {analysis.title}
                </Link>
                {analysis.project && (
                  <Link
                    to={`/projects/${analysis.project.id}`}
                    className="inline-flex items-center gap-1 mt-2 px-2 py-1 rounded-full bg-dark-tertiary border border-dark-border text-text-secondary text-xs hover:bg-dark-elevated transition-colors"
                  >
                    <FolderKanban className="w-3 h-3" />
                    {analysis.project.name}
                  </Link>
                )}
                <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-text-secondary">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {new Date(analysis.created_at).toLocaleDateString()}
                  </span>
                  {analysis.analysis_time != null && analysis.analysis_time > 0 && (
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
                  <div className="stat-tile text-center px-3 py-1">
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
                      className="p-2 rounded-lg border border-dark-border bg-dark-tertiary text-text-secondary hover:text-cyber-cyan hover:bg-dark-elevated transition-colors"
                    >
                      <Eye className="w-5 h-5" />
                    </motion.button>
                  </Link>
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => onRequestDelete(analysis)}
                    aria-label={`Delete analysis ${analysis.title}`}
                    className="p-2 rounded-lg border border-dark-border bg-dark-tertiary text-text-secondary hover:text-risk-critical hover:bg-dark-elevated transition-colors"
                  >
                    <Trash2 className="w-5 h-5" />
                  </motion.button>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
