import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowRight, Lock, Shield, Target, Zap } from 'lucide-react';

const CAPABILITIES = [
  {
    icon: Shield,
    title: 'STRIDE Threat Modeling',
    description: 'Consistent, category-driven threat discovery mapped to architecture behavior.',
  },
  {
    icon: Zap,
    title: 'AI-Assisted Analysis',
    description: 'Generate actionable threat findings quickly from text, diagrams, or UML.',
  },
  {
    icon: Target,
    title: 'Risk Prioritization',
    description: 'Likelihood-impact scoring and issue prioritization to drive remediation plans.',
  },
  {
    icon: Lock,
    title: 'Mitigation Guidance',
    description: 'Operational mitigation steps designed for engineering implementation.',
  },
];

export default function LandingPage() {
  return (
    <div className="max-w-6xl mx-auto pt-6 md:pt-10">
      <section className="section-card p-7 md:p-10 relative overflow-hidden">
        <div className="absolute -right-24 -top-24 w-56 h-56 rounded-full bg-cyber-cyan/10 blur-3xl" />
        <div className="absolute -left-24 -bottom-24 w-56 h-56 rounded-full bg-cyber-blue/10 blur-3xl" />
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="relative z-10">
          <p className="page-kicker">Security Intelligence Platform</p>
          <h1 className="page-title max-w-3xl">
            Project TARA: Threat Analysis and Risk Assessment for Modern Architectures
          </h1>
          <p className="page-subtitle mt-4 max-w-2xl">
            TARA helps engineering teams evaluate system risk with STRIDE-driven analysis,
            prioritized findings, and practical mitigations.
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Link to="/login">
              <button type="button" className="btn-cyber inline-flex items-center gap-2">
                Start Analysis
                <ArrowRight className="w-4 h-4" />
              </button>
            </Link>
            <Link to="/login">
              <button type="button" className="btn-secondary">
                Sign In
              </button>
            </Link>
          </div>
        </motion.div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
        {CAPABILITIES.map((item, index) => (
          <motion.div
            key={item.title}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.06 }}
            className="section-card"
          >
            <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-dark-tertiary border border-dark-border text-cyber-cyan">
              <item.icon className="w-5 h-5" />
            </div>
            <h2 className="section-title mt-4">{item.title}</h2>
            <p className="text-sm text-text-secondary mt-2">{item.description}</p>
          </motion.div>
        ))}
      </section>
    </div>
  );
}
