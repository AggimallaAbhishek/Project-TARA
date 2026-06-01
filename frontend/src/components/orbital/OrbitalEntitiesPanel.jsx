export default function OrbitalEntitiesPanel({ entities, loading, error }) {
  return (
    <section className="orbital-panel orbital-panel--entities" aria-label="entities panel">
      <div className="orbital-panel-header">
        <h2 className="orbital-panel-title">PROJECT ENTITIES</h2>
        <span className="orbital-badge">{entities.length} TRACKED</span>
      </div>

      {error && <div className="orbital-panel-state orbital-panel-state--warn">{error}</div>}

      {loading ? (
        <div className="orbital-panel-state">Loading entity telemetry...</div>
      ) : entities.length === 0 ? (
        <div className="orbital-panel-state">No projects available yet.</div>
      ) : (
        <div className="orbital-list orbital-scroll-region orbital-scroll-region-entities">
          {entities.map((entity) => (
            <article className="orbital-entity-card" key={entity.id}>
              <div className="orbital-entity-header">
                <span className="orbital-entity-code">{entity.code}</span>
                <span className="orbital-entity-code">{entity.status.toUpperCase()}</span>
              </div>
              <h3 className="orbital-entity-name">{entity.name}</h3>
              <p className="orbital-op-meta" style={{ marginTop: 4 }}>
                <span>ANL {entity.analysisCount}</span>
                <span>HI/CRIT {entity.highRiskCount}</span>
              </p>
              <p className="orbital-entity-meta">
                <span>SCORE {entity.latestRiskScore.toFixed(1)}</span>
                <span>LAST {entity.lastSeenLabel}</span>
              </p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
