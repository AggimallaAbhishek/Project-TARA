/* eslint-disable-next-line no-unused-vars */
import { motion } from 'framer-motion';
import { TrendingUp } from 'lucide-react';

import { formatIssueKey } from './analysisMetrics';

function renderIssueLine(issue) {
  return (
    <li key={formatIssueKey(issue)} className="text-sm text-text-secondary">
      <span className="text-text-primary font-medium">{issue.name}</span>
      {' · '}
      {issue.stride_category}
      {' · '}
      {issue.affected_component}
      {' · '}
      {issue.risk_level} ({Number(issue.risk_score || 0).toFixed(1)})
    </li>
  );
}

export default function VersionComparisonPanel({
  loading,
  error,
  versionComparison,
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 }}
      className="section-card mb-6"
    >
      <h2 className="text-xl font-semibold text-text-primary mb-4 flex items-center gap-2">
        <TrendingUp className="w-5 h-5 text-cyber-cyan" />
        Version Comparison
      </h2>

      {loading ? (
        <p className="text-sm text-text-secondary">Loading version comparison...</p>
      ) : error ? (
        <div className="p-3 bg-risk-critical/10 border border-risk-critical/30 rounded-lg text-sm text-risk-critical">
          {error}
        </div>
      ) : versionComparison ? (
        <div className="space-y-4">
          {versionComparison.has_previous_version ? (
            <>
              <div className="grid sm:grid-cols-4 gap-3">
                <div className="stat-tile">
                  <p className="text-xs text-text-muted">Previous Issues</p>
                  <p className="text-xl font-semibold text-text-primary">{versionComparison.previous_total_issues}</p>
                </div>
                <div className="stat-tile">
                  <p className="text-xs text-text-muted">Resolved</p>
                  <p className="text-xl font-semibold text-green-400">{versionComparison.resolved_issues_count}</p>
                </div>
                <div className="stat-tile">
                  <p className="text-xs text-text-muted">Unresolved</p>
                  <p className="text-xl font-semibold text-amber-400">{versionComparison.unresolved_issues_count}</p>
                </div>
                <div className="stat-tile">
                  <p className="text-xs text-text-muted">New Issues</p>
                  <p className="text-xl font-semibold text-risk-critical">{versionComparison.new_issues_count}</p>
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <div className="stat-tile">
                  <h3 className="text-sm font-semibold text-green-400 mb-2">Resolved Issues</h3>
                  {versionComparison.resolved_issues.length === 0 ? (
                    <p className="text-sm text-text-muted">No resolved issues.</p>
                  ) : (
                    <ul className="space-y-2">
                      {versionComparison.resolved_issues.map(renderIssueLine)}
                    </ul>
                  )}
                </div>
                <div className="stat-tile">
                  <h3 className="text-sm font-semibold text-amber-400 mb-2">Unresolved Issues</h3>
                  {versionComparison.unresolved_issues.length === 0 ? (
                    <p className="text-sm text-text-muted">No unresolved issues.</p>
                  ) : (
                    <ul className="space-y-2">
                      {versionComparison.unresolved_issues.map(renderIssueLine)}
                    </ul>
                  )}
                </div>
                <div className="stat-tile">
                  <h3 className="text-sm font-semibold text-risk-critical mb-2">Newly Introduced Issues</h3>
                  {versionComparison.new_issues.length === 0 ? (
                    <p className="text-sm text-text-muted">No newly introduced issues.</p>
                  ) : (
                    <ul className="space-y-2">
                      {versionComparison.new_issues.map(renderIssueLine)}
                    </ul>
                  )}
                </div>
              </div>
            </>
          ) : (
            <p className="text-sm text-text-secondary">
              This is the first version for this title. Future uploads with the same title will include progress comparison.
            </p>
          )}
        </div>
      ) : (
        <p className="text-sm text-text-muted">No version comparison data available.</p>
      )}
    </motion.div>
  );
}
