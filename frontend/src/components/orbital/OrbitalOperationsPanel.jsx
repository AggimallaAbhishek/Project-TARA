function statusClass(status) {
  if (status === 'critical') return 'critical';
  if (status === 'active') return 'active';
  if (status === 'standby') return 'standby';
  return 'intel';
}

export default function OrbitalOperationsPanel({ operations, loading, error }) {
  return (
    <section className="orbital-panel orbital-panel--ops" aria-label="operations panel">
      <div className="orbital-panel-header">
        <h2 className="orbital-panel-title">ACTIVE OPERATIONS</h2>
        <span className="orbital-badge">{operations.length} LIVE</span>
      </div>

      {error && <div className="orbital-panel-state orbital-panel-state--warn">{error}</div>}

      {loading ? (
        <div className="orbital-panel-state">Loading operations telemetry...</div>
      ) : operations.length === 0 ? (
        <div className="orbital-panel-state">No analyses available yet. Run an analysis to populate operations.</div>
      ) : (
        <div className="orbital-list orbital-scroll-region orbital-scroll-region-ops">
          {operations.map((operation) => (
            <article className="orbital-op-card" key={operation.id}>
              <div className="orbital-op-top">
                <span className={`orbital-op-code ${statusClass(operation.status)}`}>{operation.code}</span>
                <span className={`orbital-op-code ${statusClass(operation.status)}`}>{operation.statusLabel}</span>
              </div>
              <h3 className="orbital-op-name">{operation.name}</h3>
              <div className="orbital-op-meta">
                <span>{operation.projectName}</span>
                <span>THREATS {operation.threatCount}</span>
                <span>HI/CRIT {operation.highRiskCount}</span>
                <span>{operation.createdAtLabel}</span>
              </div>
              <div className="orbital-progress">
                <div style={{ width: `${operation.progress}%` }} />
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
