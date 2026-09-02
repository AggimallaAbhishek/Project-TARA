import { useEffect, useState } from 'react';
import { buildClockSnapshot } from '../../utils/timeClock';

export default function OrbitalTopNav({ heroTelemetry }) {
  const [clock, setClock] = useState(() => buildClockSnapshot());
  const threatLevel = heroTelemetry.threatLevel || 'TEAL';
  const threatClass = threatLevel === 'CRITICAL' ? 'red' : threatLevel === 'AMBER' ? 'amber' : 'teal';

  useEffect(() => {
    const timer = window.setInterval(() => {
      setClock(buildClockSnapshot());
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
      {/* Telemetry only. The centre previously carried an "ORBITAL COMMAND
          GRID" title, which duplicated the global navbar's role and named the
          design system rather than anything the user works with. The "REAL API
          DATA" chip was a developer note, not a user-facing label. */}
      <div className="orbital-topbar-left">
        <span className="orbital-chip">Live</span>
      </div>

      <div className="orbital-topbar-right">
        <span className="orbital-topbar-stat">OPS <b>{heroTelemetry.operationCount}</b></span>
        <span className="orbital-topbar-stat">ALERTS <b className="red">{heroTelemetry.criticalCount}</b></span>
        <span className="orbital-topbar-stat">THREAT <b className={threatClass}>{threatLevel}</b></span>
        <span className="orbital-topbar-stat">FEED <b>{heroTelemetry.feedCount}</b></span>
        <span className="orbital-topbar-stat">UTC <b>{clock.utc}</b></span>
        <span className="orbital-topbar-stat">{clock.localZoneLabel} <b>{clock.local}</b> ({clock.localUtcOffset})</span>
      </div>
    </header>
  );
}
