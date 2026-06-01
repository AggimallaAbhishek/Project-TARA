import { useEffect, useMemo, useRef, useState } from 'react';
/* eslint-disable-next-line no-unused-vars */
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Lock, Radar, Shield, Target, Zap } from 'lucide-react';
import './orbitalLanding.css';
import {
  deriveBootModuleStatus,
  generateHexTelemetry,
  resolveBootDurationMs,
  shouldRunLandingBoot,
} from './landingBootUtils';
import { buildClockSnapshot } from '../utils/timeClock';
import { isReducedMotionPreferred } from '../components/orbital/orbitalMotion';

const HERO_SUBTITLES = [
  'THREAT LEVEL AMBER - MONITORING ACTIVE SYSTEMS',
  'REAL-TIME STRIDE OPERATIONS - UPLINK STABLE',
  'AI-ASSISTED RISK TRIAGE - ANALYSIS GRID ONLINE',
];

const MISSION_BRIEF = [
  {
    label: 'WHAT',
    body: 'Project TARA evaluates architecture-level threats across services, trust boundaries, and data flows using structured STRIDE analysis.',
  },
  {
    label: 'WHY',
    body: 'Security review cycles often miss high-impact risks due to fragmented context. TARA centralizes risk detection, prioritization, and mitigation guidance.',
  },
  {
    label: 'WHO',
    body: 'Built for platform, application, and security engineering teams that need repeatable threat analysis workflows with evidence-backed risk scoring.',
  },
];

const OPS_CARDS = [
  { code: 'OP-STRIDE', status: 'ACTIVE', title: 'System Threat Discovery', detail: 'Text, document, and UML input pipelines', progress: 92 },
  { code: 'OP-RISK', status: 'ACTIVE', title: 'Risk Scoring Engine', detail: 'Likelihood x impact prioritization', progress: 86 },
  { code: 'OP-AUDIT', status: 'LIVE', title: 'Security Activity Log', detail: 'Global immutable event timeline', progress: 79 },
  { code: 'OP-COMP', status: 'ACTIVE', title: 'Version Comparison', detail: 'Cross-analysis delta and trend tracking', progress: 74 },
];

const BOOT_MODULES = [
  { name: 'AUTH GATEWAY', addr: 'AUTH·01' },
  { name: 'THREAT ENGINE', addr: 'RISK·02' },
  { name: 'AUDIT STREAM', addr: 'LOGS·03' },
  { name: 'COMPARE CORE', addr: 'COMP·04' },
  { name: 'PROJECT GRAPH', addr: 'DATA·05' },
  { name: 'EXPORT NODE', addr: 'PDF·06' },
];

const BOOT_LOGS = [
  'Bootstrapping orbital shell...',
  'Loading threat analysis modules...',
  'Establishing audit telemetry stream...',
  'Synchronizing project workspace graph...',
  'Validating STRIDE risk pipelines...',
  'TARA command layer online.',
];

const CAPABILITIES = [
  {
    icon: Shield,
    title: 'STRIDE Threat Modeling',
    description: 'Consistent category-driven threat discovery mapped to architecture behavior.',
  },
  {
    icon: Zap,
    title: 'AI-Assisted Analysis',
    description: 'Generate actionable findings quickly from text, uploads, and UML diagrams.',
  },
  {
    icon: Target,
    title: 'Risk Prioritization',
    description: 'Likelihood-impact scoring focused on critical and high-risk outcomes.',
  },
  {
    icon: Lock,
    title: 'Mitigation Guidance',
    description: 'Remediation recommendations designed for engineering implementation.',
  },
];

const INITIAL_METRICS = {
  analyses: 0,
  operations: 0,
  interfaces: 0,
};

const TARGET_METRICS = {
  analyses: 3,
  operations: OPS_CARDS.length,
  interfaces: 6,
};

export default function LandingPage() {
  const navigate = useNavigate();
  const prefersReducedMotion = useMemo(() => isReducedMotionPreferred(), []);
  const shouldBootAtInit = useMemo(() => {
    const isE2E = import.meta.env.VITE_E2E === 'true';
    return shouldRunLandingBoot({ isE2E, prefersReducedMotion });
  }, [prefersReducedMotion]);

  const [clock, setClock] = useState(() => buildClockSnapshot());
  const [subtitleIndex, setSubtitleIndex] = useState(0);
  const [metrics, setMetrics] = useState(INITIAL_METRICS);
  const [isBootRunning, setIsBootRunning] = useState(shouldBootAtInit);
  const [isBootExiting, setIsBootExiting] = useState(false);
  const [isPageVisible, setIsPageVisible] = useState(!shouldBootAtInit);
  const [bootProgress, setBootProgress] = useState(0);
  const [bootLogCount, setBootLogCount] = useState(0);
  const [bootHexStream, setBootHexStream] = useState(generateHexTelemetry(36));
  const bootInitLoggedRef = useRef(false);
  const bootDurationMs = useMemo(
    () => (shouldBootAtInit ? resolveBootDurationMs() : 0),
    [shouldBootAtInit],
  );

  const bootRainColumns = useMemo(
    () =>
      Array.from({ length: 18 }, (_, idx) => ({
        id: `col-${idx}`,
        left: 3 + idx * 5.2,
        duration: 6.2 + (idx % 6),
        delay: idx * 0.35,
        stream: generateHexTelemetry(96),
      })),
    [],
  );

  const bootModules = useMemo(
    () =>
      BOOT_MODULES.map((module, index) => ({
        ...module,
        status: deriveBootModuleStatus(bootProgress, index, BOOT_MODULES.length),
      })),
    [bootProgress],
  );

  const visibleBootLogs = useMemo(
    () => BOOT_LOGS.slice(0, bootLogCount),
    [bootLogCount],
  );

  const currentSubtitle = useMemo(() => HERO_SUBTITLES[subtitleIndex], [subtitleIndex]);

  useEffect(() => {
    if (bootInitLoggedRef.current) return;
    bootInitLoggedRef.current = true;

    if (import.meta.env.DEV) {
      console.debug(
        isBootRunning
          ? `landing.boot.start duration_ms=${bootDurationMs}`
          : 'landing.boot.skip',
      );
    }
  }, [bootDurationMs, isBootRunning]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setClock(buildClockSnapshot());
    }, 1000);
    return () => {
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setSubtitleIndex((prev) => (prev + 1) % HERO_SUBTITLES.length);
    }, 3200);
    return () => {
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    let frameId;
    const startAt = performance.now();
    const duration = 1200;

    const animate = (timestamp) => {
      const progress = Math.min((timestamp - startAt) / duration, 1);
      setMetrics({
        analyses: Math.round(TARGET_METRICS.analyses * progress),
        operations: Math.round(TARGET_METRICS.operations * progress),
        interfaces: Math.round(TARGET_METRICS.interfaces * progress),
      });

      if (progress < 1) {
        frameId = window.requestAnimationFrame(animate);
      }
    };

    frameId = window.requestAnimationFrame(animate);
    return () => {
      if (frameId) {
        window.cancelAnimationFrame(frameId);
      }
    };
  }, []);

  useEffect(() => {
    if (!isBootRunning) return undefined;

    let frameId;
    const startAt = performance.now();

    const updateBootFrame = (timestamp) => {
      const elapsed = Math.max(0, timestamp - startAt);
      const ratio = Math.min(1, elapsed / bootDurationMs);
      setBootProgress(Math.round(ratio * 100));
      setBootLogCount(Math.min(BOOT_LOGS.length, Math.max(1, Math.ceil(ratio * BOOT_LOGS.length))));

      if (ratio < 1) {
        frameId = window.requestAnimationFrame(updateBootFrame);
      }
    };

    frameId = window.requestAnimationFrame(updateBootFrame);

    const hexTimer = window.setInterval(() => {
      setBootHexStream(generateHexTelemetry(36));
    }, 120);

    return () => {
      window.cancelAnimationFrame(frameId);
      window.clearInterval(hexTimer);
    };
  }, [bootDurationMs, isBootRunning]);

  useEffect(() => {
    if (!isBootRunning) return undefined;
    if (bootProgress < 100 || bootLogCount < BOOT_LOGS.length) return undefined;

    if (import.meta.env.DEV) {
      console.debug('landing.boot.complete');
    }

    const exitTimer = window.setTimeout(() => {
      setIsBootExiting(true);
    }, 0);

    const finishTimer = window.setTimeout(() => {
      setIsBootRunning(false);
      setIsPageVisible(true);
      setIsBootExiting(false);
    }, 550);

    return () => {
      window.clearTimeout(exitTimer);
      window.clearTimeout(finishTimer);
    };
  }, [bootLogCount, bootProgress, isBootRunning]);

  return (
    <div className="orbital-landing">
      {(isBootRunning || isBootExiting) && (
        <div className={`orbital-boot ${isBootExiting ? 'done' : ''}`} data-testid="orbital-landing-boot">
          <div className="orbital-boot-rain" aria-hidden="true">
            {bootRainColumns.map((column) => (
              <span
                key={column.id}
                className="orbital-boot-rain-col"
                style={{
                  left: `${column.left}%`,
                  animationDuration: `${column.duration}s`,
                  animationDelay: `-${column.delay}s`,
                }}
              >
                {column.stream}
              </span>
            ))}
          </div>

          <div className="orbital-boot-content">
            <div className="orbital-boot-title-row">
              <h2 className="orbital-boot-title">ORBITAL</h2>
              <span className="orbital-boot-version">TARA v4.8.1-SEC</span>
            </div>
            <p className="orbital-boot-subtitle">THREAT ANALYSIS RESPONSE & ASSESSMENT</p>

            <div className="orbital-boot-modules">
              {bootModules.map((module) => (
                <div key={module.addr} className="orbital-boot-module">
                  <div className={`orbital-boot-spinner ${module.status}`} />
                  <div className="orbital-boot-module-info">
                    <p className="orbital-boot-module-name">{module.name}</p>
                    <p className="orbital-boot-module-addr">{module.addr}</p>
                  </div>
                  <p className={`orbital-boot-module-status ${module.status}`}>
                    {module.status === 'ok' ? 'ONLINE' : module.status === 'loading' ? 'SYNC' : 'WAIT'}
                  </p>
                </div>
              ))}
            </div>

            <div className="orbital-boot-log">
              {visibleBootLogs.map((line) => (
                <p key={line}>{line}</p>
              ))}
            </div>

            <div className="orbital-boot-progress">
              <div className="orbital-boot-progress-head">
                <span>INITIALIZING COMMAND LAYER</span>
                <span>{bootProgress}%</span>
              </div>
              <div className="orbital-boot-progress-track">
                <div className="orbital-boot-progress-fill" style={{ width: `${bootProgress}%` }} />
              </div>
              <div className="orbital-boot-hex">{bootHexStream}</div>
            </div>
          </div>
        </div>
      )}

      <div className={`orbital-landing-page ${isPageVisible ? 'visible' : 'hidden'}`}>
      <section className="orbital-hero-section">
        <div className="orbital-grid-overlay" />
        <div className="orbital-scanline" />

        <div className="orbital-hud orbital-hud-top-left">
          <span>PROJECT TARA // ACTIVE</span>
          <span className="orbital-hud-time">UTC {clock.utc}</span>
          <span className="orbital-hud-local">{clock.localZoneLabel} {clock.local} ({clock.localUtcOffset})</span>
        </div>
        <div className="orbital-hud orbital-hud-top-right">
          <span>THREAT MODEL GRID</span>
          <span className="orbital-hud-alert">AMBER STATUS</span>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="orbital-hero-content"
        >
          <div className="orbital-classification">SECURITY PROGRAM // TARA</div>
          <p className="orbital-hero-eyebrow">THREAT ANALYSIS RESPONSE & ASSESSMENT</p>
          <h1 className="orbital-hero-title">Project TARA</h1>
          <p className="orbital-hero-wordmark">ORBITAL COMMAND LAYER</p>
          <p className="orbital-hero-subtitle">{currentSubtitle}</p>

          <div className="orbital-hero-metrics">
            <span>INPUT MODES {metrics.analyses}</span>
            <span>LIVE OPS {metrics.operations}</span>
            <span>API SURFACES {metrics.interfaces}</span>
          </div>

          <div className="orbital-hero-actions">
            <button type="button" className="orbital-cta-primary" onClick={() => navigate('/login')}>
              START ANALYSIS
              <ArrowRight className="w-4 h-4" />
            </button>
            <button type="button" className="orbital-cta-secondary" onClick={() => navigate('/login')}>
              Sign In
            </button>
          </div>
        </motion.div>
      </section>

      <section className="orbital-section orbital-brief-section">
        <div className="orbital-section-head">
          <p className="orbital-section-kicker">MISSION BRIEF</p>
          <h2 className="orbital-section-title">WHAT WE ANALYZE. WHY IT MATTERS. WHO IT HELPS.</h2>
        </div>
        <div className="orbital-brief-grid">
          {MISSION_BRIEF.map((item) => (
            <article key={item.label} className="orbital-brief-card">
              <h3>{item.label}</h3>
              <p>{item.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="orbital-section orbital-ops-section">
        <div className="orbital-surface-grid">
          <article className="orbital-map-panel">
            <div className="orbital-panel-header">
              <p>THREAT SURFACE MONITOR</p>
              <span>LIVE</span>
            </div>
            <div className="orbital-map-canvas">
              <div className="orbital-map-point high" style={{ left: '18%', top: '36%' }} />
              <div className="orbital-map-point medium" style={{ left: '42%', top: '29%' }} />
              <div className="orbital-map-point low" style={{ left: '66%', top: '41%' }} />
              <div className="orbital-map-point info" style={{ left: '54%', top: '62%' }} />
              <div className="orbital-map-point high" style={{ left: '31%', top: '68%' }} />
              <Radar className="orbital-map-icon" />
            </div>
            <div className="orbital-map-legend">
              <span className="high">HIGH</span>
              <span className="medium">MEDIUM</span>
              <span className="low">LOW</span>
              <span className="info">TRACE</span>
            </div>
          </article>

          <article className="orbital-ops-panel">
            <div className="orbital-panel-header">
              <p>ACTIVE OPERATIONS</p>
              <span>{OPS_CARDS.length} LIVE</span>
            </div>
            <div className="orbital-ops-list">
              {OPS_CARDS.map((op) => (
                <div key={op.code} className="orbital-op-card">
                  <div className="orbital-op-top">
                    <span>{op.code}</span>
                    <span>{op.status}</span>
                  </div>
                  <h3>{op.title}</h3>
                  <p>{op.detail}</p>
                  <div className="orbital-op-progress">
                    <div style={{ width: `${op.progress}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </article>
        </div>
      </section>

      <section className="orbital-section orbital-capabilities-section">
        <div className="orbital-section-head">
          <p className="orbital-section-kicker">PLATFORM CAPABILITIES</p>
          <h2 className="orbital-section-title">CORE SECURITY WORKFLOWS</h2>
        </div>
        <div className="orbital-cap-grid">
          {CAPABILITIES.map((item) => (
            <article key={item.title} className="orbital-cap-card">
              <span className="orbital-cap-icon">
                <item.icon className="w-5 h-5" />
              </span>
              <h3>{item.title}</h3>
              <p>{item.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="orbital-section orbital-access-section">
        <div className="orbital-access-card">
          <p className="orbital-section-kicker">CLEARANCE REQUEST TERMINAL</p>
          <h2 className="orbital-section-title">ENTER THE TARA ANALYSIS WORKSPACE</h2>
          <p className="orbital-access-copy">
            Authenticate to run architecture threat analyses, review historical assessments, compare versions, and track global audit activity.
          </p>
          <div className="orbital-hero-actions">
            <button type="button" className="orbital-cta-primary" onClick={() => navigate('/login')}>
              TRANSMIT ACCESS REQUEST
              <ArrowRight className="w-4 h-4" />
            </button>
            <button type="button" className="orbital-cta-secondary" onClick={() => navigate('/login')}>
              Open Portal
            </button>
          </div>
        </div>
      </section>
      </div>
    </div>
  );
}
