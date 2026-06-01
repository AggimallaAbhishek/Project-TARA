import {
  buildDashboardViewModel,
  mapAnalysesToOperations,
  mapAuditLogsToFeed,
  mapProjectsToEntities,
} from './orbitalMappers';

describe('orbitalMappers', () => {
  it('maps analyses into operations with deterministic status and progress', () => {
    const operations = mapAnalysesToOperations([
      {
        id: 42,
        title: 'Payment Service',
        total_risk_score: 16,
        threat_count: 4,
        high_risk_count: 2,
        project: { name: 'Platform A' },
        created_at: '2026-01-02T10:00:00Z',
        analysis_time: 0.8,
      },
    ]);

    expect(operations).toHaveLength(1);
    expect(operations[0]).toMatchObject({
      id: 42,
      code: 'OP-0042',
      status: 'critical',
      statusLabel: 'CRITICAL',
      projectName: 'Platform A',
      threatCount: 4,
      highRiskCount: 2,
    });
    expect(operations[0].progress).toBeGreaterThan(0);
  });

  it('maps audit logs into feed rows with severity', () => {
    const rows = mapAuditLogsToFeed([
      {
        id: 1,
        analysis_id: 42,
        project_id: 7,
        action: 'analysis_deleted',
        created_at: '2026-01-03T00:00:00Z',
        event_metadata: { title: 'Payment Service' },
      },
    ]);

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      id: 1,
      source: 'ANL-42',
      severity: 'alert',
    });
    expect(rows[0].message).toContain('Analysis deleted');
  });

  it('maps projects into entity cards', () => {
    const entities = mapProjectsToEntities([
      {
        id: 7,
        name: 'Banking Platform',
        description: 'Workspace',
        analysis_count: 3,
        high_risk_count: 1,
        total_threat_count: 8,
        latest_risk_score: 12.4,
        latest_analysis_at: '2026-01-04T00:00:00Z',
      },
    ]);

    expect(entities).toHaveLength(1);
    expect(entities[0]).toMatchObject({
      id: 7,
      name: 'Banking Platform',
      analysisCount: 3,
      highRiskCount: 1,
      latestRiskScore: 12.4,
    });
  });

  it('builds dashboard view model with operations/feed/entities', () => {
    const model = buildDashboardViewModel({
      analyses: [{ id: 99, title: 'A', total_risk_score: 6 }],
      auditLogs: [],
      projects: [],
    });

    expect(model.operations).toHaveLength(1);
    expect(model.feed).toHaveLength(0);
    expect(model.entities).toHaveLength(0);
    expect(model.hero.operationCount).toBe(1);
  });
});
