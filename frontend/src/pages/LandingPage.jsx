import { useEffect, useMemo, useState } from 'react';
/* eslint-disable-next-line no-unused-vars */
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowRight, Lock, Radar, Shield, Target, Zap } from 'lucide-react';
import './orbitalLanding.css';

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

function formatUtcNow() {
  const now = new Date();
  const hh = String(now.getUTCHours()).padStart(2, '0');
  const mm = String(now.getUTCMinutes()).padStart(2, '0');
  const ss = String(now.getUTCSeconds()).padStart(2, '0');
  return `${hh}:${mm}:${ss}Z`;
}

export default function LandingPage() {
  const [clock, setClock] = useState(formatUtcNow());
  const [subtitleIndex, setSubtitleIndex] = useState(0);
  const [metrics, setMetrics] = useState(INITIAL_METRICS);
  const currentSubtitle = useMemo(() => HERO_SUBTITLES[subtitleIndex], [subtitleIndex]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setClock(formatUtcNow());
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

  return (
    <div className="orbital-landing">
      <section className="orbital-hero-section">
        <div className="orbital-grid-overlay" />
        <div className="orbital-scanline" />

        <div className="orbital-hud orbital-hud-top-left">
          <span>PROJECT TARA // ACTIVE</span>
          <span className="orbital-hud-time">UTC {clock}</span>
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
            <Link to="/login">
              <button type="button" className="orbital-cta-primary">
                START ANALYSIS
                <ArrowRight className="w-4 h-4" />
              </button>
            </Link>
            <Link to="/login">
              <button type="button" className="orbital-cta-secondary">
                Sign In
              </button>
            </Link>
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
            <Link to="/login">
              <button type="button" className="orbital-cta-primary">
                TRANSMIT ACCESS REQUEST
                <ArrowRight className="w-4 h-4" />
              </button>
            </Link>
            <Link to="/login">
              <button type="button" className="orbital-cta-secondary">
                Open Login
              </button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
