export default function OrbitalHero({ heroTelemetry }) {
  return (
    <section className="orbital-hero" aria-label="Workspace overview" data-testid="orbital-hero">
      <div>
        {/* The h1 names the page's job. It previously read "ORBITAL" - the
            internal design-system name - under a decorative eyebrow, so the
            main heading of the primary working page said nothing about the
            work being done on it. */}
        <h1 className="orbital-hero-title">Threat analysis</h1>
        <p className="orbital-hero-subtitle">
          Describe a system, upload a document, or submit a UML diagram to get STRIDE threats back.
        </p>
        <div className="orbital-hero-metrics">
          <span className="orbital-metric-pill">
            Threat level <b>{heroTelemetry.threatLevel}</b>
          </span>
          <span className="orbital-metric-pill">
            Operations <b>{heroTelemetry.operationCount}</b>
          </span>
          <span className="orbital-metric-pill">
            Critical <b>{heroTelemetry.criticalCount}</b>
          </span>
          <span className="orbital-metric-pill">
            Projects <b>{heroTelemetry.entityCount}</b>
          </span>
        </div>
      </div>
    </section>
  );
}
