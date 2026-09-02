import { useEffect, useState } from 'react';
/* eslint-disable-next-line no-unused-vars */
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, FileText, GitCompare, Lock, Shield, Target, Zap } from 'lucide-react';
import './orbitalLanding.css';
import { buildClockSnapshot } from '../utils/timeClock';

const MISSION_BRIEF = [
  {
    label: 'What',
    body: 'TARA evaluates architecture-level threats across services, trust boundaries, and data flows using structured STRIDE analysis.',
  },
  {
    label: 'Why',
    body: 'Security review cycles miss high-impact risks when context is fragmented. TARA centralizes risk detection, prioritization, and mitigation guidance.',
  },
  {
    label: 'Who',
    body: 'Built for platform, application, and security engineering teams that need repeatable threat analysis with evidence-backed risk scoring.',
  },
];

// The six STRIDE categories. This is the domain's own structure, so it is the
// page's organizing device rather than a decorative panel: every analysis TARA
// produces is bucketed into exactly these six.
const STRIDE_CATEGORIES = [
  { key: 'S', name: 'Spoofing', violates: 'Authentication' },
  { key: 'T', name: 'Tampering', violates: 'Integrity' },
  { key: 'R', name: 'Repudiation', violates: 'Non-repudiation' },
  { key: 'I', name: 'Information disclosure', violates: 'Confidentiality' },
  { key: 'D', name: 'Denial of service', violates: 'Availability' },
  { key: 'E', name: 'Elevation of privilege', violates: 'Authorization' },
];

const INPUT_MODES = [
  { icon: FileText, title: 'Describe a system', detail: 'Paste an architecture description and get threats back.' },
  { icon: Shield, title: 'Upload a document', detail: 'Design docs and specs, parsed and analyzed in place.' },
  { icon: GitCompare, title: 'Submit a UML diagram', detail: 'Mermaid and PlantUML source, rendered and read.' },
];

const CAPABILITIES = [
  {
    icon: Shield,
    title: 'STRIDE threat modeling',
    description: 'Category-driven threat discovery mapped to how your architecture actually behaves.',
  },
  {
    icon: Zap,
    title: 'AI-assisted analysis',
    description: 'Actionable findings from text, uploads, and UML diagrams in a single pass.',
  },
  {
    icon: Target,
    title: 'Risk prioritization',
    description: 'Likelihood and impact scoring that surfaces critical and high-risk outcomes first.',
  },
  {
    icon: Lock,
    title: 'Mitigation guidance',
    description: 'Remediation steps written for the engineers who will implement them.',
  },
];

export default function LandingPage() {
  const navigate = useNavigate();
  const [clock, setClock] = useState(() => buildClockSnapshot());

  useEffect(() => {
    const timer = window.setInterval(() => {
      setClock(buildClockSnapshot());
    }, 1000);
    return () => {
      window.clearInterval(timer);
    };
  }, []);

  return (
    <div className="orbital-landing">
      <div className="orbital-landing-page visible">
        <section className="orbital-hero-section">
          <div className="orbital-hud orbital-hud-top-left">
            <span className="orbital-hud-time">UTC {clock.utc}</span>
            <span className="orbital-hud-local">
              {clock.localZoneLabel} {clock.local} ({clock.localUtcOffset})
            </span>
          </div>

          {/* Animates from an already-visible default: only the offset moves,
              never opacity. An `initial={{ opacity: 0 }}` would leave the hero
              blank for anyone whose motion runtime does not start - the same
              class of failure as the boot overlay this page just lost. */}
          <motion.div
            initial={{ y: 12 }}
            animate={{ y: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="orbital-hero-content"
          >
            <h1 className="orbital-hero-title">Project TARA</h1>
            <p className="orbital-hero-subtitle">
              Threat analysis and risk assessment for system architecture, using STRIDE.
            </p>

            <div className="orbital-hero-actions">
              <button type="button" className="orbital-cta-primary" onClick={() => navigate('/login')}>
                Start an analysis
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </button>
              <button type="button" className="orbital-cta-secondary" onClick={() => navigate('/login')}>
                Sign In
              </button>
            </div>
          </motion.div>

          {/* The signature: the six STRIDE categories as a register running
              under the hero. It states what the product actually does more
              precisely than any tagline, and each row carries the security
              property that category violates. */}
          <div className="stride-spine" aria-label="The six STRIDE threat categories">
            {STRIDE_CATEGORIES.map((category) => (
              <div key={category.key} className="stride-spine-item">
                <span className="stride-spine-key" aria-hidden="true">{category.key}</span>
                <span className="stride-spine-name">{category.name}</span>
                <span className="stride-spine-violates">{category.violates}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="orbital-section orbital-brief-section">
          <h2 className="orbital-section-title">What we analyze, why it matters, who it helps</h2>
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
          <h2 className="orbital-section-title">Three ways to start</h2>
          <div className="orbital-input-grid">
            {INPUT_MODES.map((mode) => (
              <article key={mode.title} className="orbital-input-card">
                <mode.icon className="w-5 h-5" aria-hidden="true" />
                <h3>{mode.title}</h3>
                <p>{mode.detail}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="orbital-section orbital-capabilities-section">
          <h2 className="orbital-section-title">Core security workflows</h2>
          <div className="orbital-cap-grid">
            {CAPABILITIES.map((item) => (
              <article key={item.title} className="orbital-cap-card">
                <span className="orbital-cap-icon">
                  <item.icon className="w-5 h-5" aria-hidden="true" />
                </span>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="orbital-section orbital-access-section">
          <div className="orbital-access-card">
            <h2 className="orbital-section-title">Open the TARA workspace</h2>
            <p className="orbital-access-copy">
              Sign in to run architecture threat analyses, review past assessments, compare
              versions, and track audit activity.
            </p>
            <div className="orbital-hero-actions">
              <button type="button" className="orbital-cta-primary" onClick={() => navigate('/login')}>
                Start an analysis
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
