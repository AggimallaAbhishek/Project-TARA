export function getThreatLevelFromScore(score) {
  const numericScore = Number(score || 0);
  if (numericScore >= 16) return 'critical';
  if (numericScore >= 10) return 'high';
  if (numericScore >= 5) return 'medium';
  return 'low';
}

function operationStatusFromThreat(threatLevel) {
  if (threatLevel === 'critical') return 'critical';
  if (threatLevel === 'high') return 'active';
  if (threatLevel === 'medium') return 'standby';
  return 'intel';
}

function formatUtcTime(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return `${String(date.getUTCHours()).padStart(2, '0')}:${String(date.getUTCMinutes()).padStart(2, '0')}Z`;
}

function safePercentFromScore(score) {
  const numericScore = Number(score || 0);
  const projected = Math.round((numericScore / 20) * 100);
  return Math.max(6, Math.min(100, projected));
}

export function mapAnalysesToOperations(items = []) {
  return items.slice(0, 8).map((analysis) => {
    const threatLevel = getThreatLevelFromScore(analysis.total_risk_score);
    const status = operationStatusFromThreat(threatLevel);
    const createdAtLabel = formatUtcTime(analysis.created_at);

    return {
      id: analysis.id,
      code: `OP-${String(analysis.id).padStart(4, '0')}`,
      name: analysis.title || `Analysis #${analysis.id}`,
      status,
      statusLabel: status.toUpperCase(),
      projectName: analysis.project?.name || 'Unassigned Project',
      threatCount: Number(analysis.threat_count || 0),
      highRiskCount: Number(analysis.high_risk_count || 0),
      score: Number(analysis.total_risk_score || 0),
      progress: safePercentFromScore(analysis.total_risk_score),
      createdAtLabel,
      analysisTime: Number(analysis.analysis_time || 0),
    };
  });
}

const AUDIT_ACTION_LABELS = {
  analysis_created: 'Analysis created',
  analysis_deleted: 'Analysis deleted',
  comparison_created: 'Comparison created',
  pdf_exported: 'PDF exported',
  project_created: 'Project created',
  project_updated: 'Project updated',
};

export function mapAuditLogsToFeed(items = []) {
  return items.slice(0, 24).map((event) => {
    const action = AUDIT_ACTION_LABELS[event.action] || event.action || 'Audit event';
    const hasAnalysis = Boolean(event.analysis_id);
    const hasProject = Boolean(event.project_id);
    const source = hasAnalysis
      ? `ANL-${event.analysis_id}`
      : hasProject
        ? `PRJ-${event.project_id}`
        : 'SYS';

    const messageParts = [action];
    if (event.event_metadata?.title) {
      messageParts.push(`— ${event.event_metadata.title}`);
    }

    const severity = event.action?.includes('deleted') ? 'alert' : event.action?.includes('updated') ? 'warn' : 'info';

    return {
      id: event.id,
      source,
      severity,
      timeLabel: formatUtcTime(event.created_at),
      message: messageParts.join(' '),
    };
  });
}

function agentCodeFromName(name = '') {
  const clean = name.replace(/[^A-Za-z0-9 ]/g, '').trim();
  if (!clean) return 'SYS';
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 3).toUpperCase();
  return `${parts[0][0] || ''}${parts[1][0] || ''}${parts[1][1] || ''}`.toUpperCase();
}

export function mapProjectsToEntities(items = []) {
  return items.slice(0, 8).map((project) => {
    const latestScore = Number(project.latest_risk_score || 0);
    const threatLevel = getThreatLevelFromScore(latestScore);

    return {
      id: project.id,
      code: agentCodeFromName(project.name),
      name: project.name,
      description: project.description || 'No description provided',
      analysisCount: Number(project.analysis_count || 0),
      highRiskCount: Number(project.high_risk_count || 0),
      totalThreatCount: Number(project.total_threat_count || 0),
      latestRiskScore: latestScore,
      status: threatLevel,
      lastSeenLabel: formatUtcTime(project.latest_analysis_at),
    };
  });
}

export function buildHeroTelemetry({ operations = [], feed = [], entities = [] }) {
  const criticalCount = operations.filter((operation) => operation.status === 'critical').length;
  const highOrCriticalCount = operations.filter((operation) => ['critical', 'active'].includes(operation.status)).length;
  const averageProgress = operations.length > 0
    ? Math.round(operations.reduce((sum, operation) => sum + operation.progress, 0) / operations.length)
    : 0;

  const threatLevel = criticalCount > 0
    ? 'RED'
    : highOrCriticalCount >= 3
      ? 'AMBER'
      : 'TEAL';

  return {
    operationCount: operations.length,
    feedCount: feed.length,
    entityCount: entities.length,
    criticalCount,
    threatLevel,
    averageProgress,
  };
}

export function buildDashboardViewModel({ analyses = [], auditLogs = [], projects = [] } = {}) {
  const operations = mapAnalysesToOperations(analyses);
  const feed = mapAuditLogsToFeed(auditLogs);
  const entities = mapProjectsToEntities(projects);
  const hero = buildHeroTelemetry({ operations, feed, entities });

  return {
    operations,
    feed,
    entities,
    hero,
  };
}
