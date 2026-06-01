export default function OrbitalHero({ heroTelemetry }) {
  return (
    <section className="orbital-hero" aria-label="ORBITAL hero" data-testid="orbital-hero">
      <div>
        <p className="orbital-hero-eyebrow">THREAT ANALYSIS RESPONSE & ASSESSMENT</p>
        <h1 className="orbital-hero-title">ORBITAL</h1>
        <p className="orbital-hero-subtitle">
          GLOBAL THREAT LEVEL {heroTelemetry.threatLevel} · AVG EXECUTION {heroTelemetry.averageProgress}%
        </p>
        <div className="orbital-hero-metrics">
          <span className="orbital-metric-pill">OPERATIONS {heroTelemetry.operationCount}</span>
          <span className="orbital-metric-pill">CRITICAL {heroTelemetry.criticalCount}</span>
          <span className="orbital-metric-pill">PROJECT ENTITIES {heroTelemetry.entityCount}</span>
        </div>
      </div>
    </section>
  );
}
