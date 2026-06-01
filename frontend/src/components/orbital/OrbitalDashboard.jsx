import { useMemo } from 'react';
import OrbitalTopNav from './OrbitalTopNav';
import OrbitalHero from './OrbitalHero';
import OrbitalMissionPanel from './OrbitalMissionPanel';
import OrbitalOperationsPanel from './OrbitalOperationsPanel';
import OrbitalSignalFeedPanel from './OrbitalSignalFeedPanel';
import OrbitalEntitiesPanel from './OrbitalEntitiesPanel';
import { isReducedMotionPreferred } from './orbitalMotion';
import './orbital.css';

export default function OrbitalDashboard({
  form,
  onSubmit,
  onModeChange,
  isSubmitDisabled,
  examples,
  onSelectExample,
  dashboard,
  loading,
  errors,
}) {
  const reducedMotion = useMemo(() => isReducedMotionPreferred(), []);

  return (
    <div
      className={`orbital-shell ${reducedMotion ? 'orbital-reduced-motion' : ''}`}
      data-testid="orbital-dashboard"
    >

      <OrbitalTopNav heroTelemetry={dashboard.hero} />
      <OrbitalHero heroTelemetry={dashboard.hero} />

      {(errors.analyses || errors.audit || errors.projects) && (
        <div className="orbital-inline-alert orbital-degraded-banner">
          Partial telemetry degraded.
          {errors.analyses ? ` OPS: ${errors.analyses}` : ''}
          {errors.audit ? ` FEED: ${errors.audit}` : ''}
          {errors.projects ? ` ENTITIES: ${errors.projects}` : ''}
        </div>
      )}

      <div className="orbital-main">
        <OrbitalMissionPanel
          form={form}
          onSubmit={onSubmit}
          onModeChange={onModeChange}
          isSubmitDisabled={isSubmitDisabled}
          examples={examples}
          onSelectExample={onSelectExample}
        />

        <div className="orbital-stack">
          <OrbitalOperationsPanel
            operations={dashboard.operations}
            loading={loading}
            error={errors.analyses}
          />
          <OrbitalSignalFeedPanel
            feed={dashboard.feed}
            loading={loading}
            error={errors.audit}
          />
        </div>

        <OrbitalEntitiesPanel
          entities={dashboard.entities}
          loading={loading}
          error={errors.projects}
        />
      </div>
    </div>
  );
}
