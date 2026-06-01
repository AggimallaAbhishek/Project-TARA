import { useEffect, useState } from 'react';

function formatUtcNow() {
  const date = new Date();
  const hh = String(date.getUTCHours()).padStart(2, '0');
  const mm = String(date.getUTCMinutes()).padStart(2, '0');
  const ss = String(date.getUTCSeconds()).padStart(2, '0');
  return `${hh}:${mm}:${ss}Z`;
}

export default function OrbitalTopNav({ heroTelemetry }) {
  const [clock, setClock] = useState(formatUtcNow());
  const threatLevel = heroTelemetry.threatLevel || 'TEAL';
  const threatClass = threatLevel === 'CRITICAL' ? 'red' : threatLevel === 'AMBER' ? 'amber' : 'teal';

  useEffect(() => {
    const timer = window.setInterval(() => {
      setClock(formatUtcNow());
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  return (
    <header
      className="orbital-topbar"
      data-testid="orbital-telemetry-header"
      aria-label="Home telemetry header"
    >
      <div className="orbital-topbar-left">
        <span className="orbital-chip teal">HOME TELEMETRY</span>
        <span className="orbital-topbar-separator" aria-hidden="true" />
        <span className="orbital-topbar-context">REAL API DATA</span>
      </div>

      <div className="orbital-topbar-title">ORBITAL COMMAND GRID</div>

      <div className="orbital-topbar-right">
        <span className="orbital-topbar-stat">OPS <b>{heroTelemetry.operationCount}</b></span>
        <span className="orbital-topbar-stat">ALERTS <b className="red">{heroTelemetry.criticalCount}</b></span>
        <span className="orbital-topbar-stat">THREAT <b className={threatClass}>{threatLevel}</b></span>
        <span className="orbital-topbar-stat">FEED <b>{heroTelemetry.feedCount}</b></span>
        <span className="orbital-topbar-stat">{clock}</span>
      </div>
    </header>
  );
}
