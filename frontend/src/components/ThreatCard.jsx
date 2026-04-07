import { useState } from 'react';
// motion is used in JSX as motion.div, motion.button
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, Target, Shield, Lightbulb } from 'lucide-react';
import RiskBadge from './RiskBadge';
import StrideBadge from './StrideBadge';

export default function ThreatCard({ threat, index = 0 }) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className="card-dark overflow-hidden"
    >
      {/* Card Header - Always visible */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        aria-expanded={isExpanded}
        className="w-full text-left p-5 cursor-pointer hover:bg-dark-tertiary/50 transition-colors"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            {/* Threat Name */}
            <h3 className="text-lg font-semibold text-text-primary mb-2 truncate">
              {threat.name}
            </h3>
            
            {/* Badges Row */}
            <div className="flex flex-wrap items-center gap-2">
              <RiskBadge level={threat.risk_level} score={threat.risk_score} />
              <StrideBadge category={threat.stride_category} showFull={false} />
              
              {/* Affected Component */}
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium bg-dark-tertiary text-text-secondary">
                <Target className="w-3 h-3" />
                {threat.affected_component}
              </span>
            </div>
          </div>

          {/* Expand Button */}
          <motion.span
            animate={{ rotate: isExpanded ? 180 : 0 }}
            className="p-2 rounded-lg bg-dark-tertiary text-text-secondary"
          >
            <ChevronDown className="w-5 h-5" />
          </motion.span>
        </div>
      </button>

      {/* Expandable Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 space-y-4 border-t border-dark-border pt-4">
              {/* Description */}
              <div>
                <h4 className="text-sm font-medium text-text-secondary mb-1 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-cyber-cyan" />
                  Description
                </h4>
                <p className="text-text-primary text-sm leading-relaxed">
                  {threat.description}
                </p>
              </div>

              {/* STRIDE Category Full */}
              <div>
                <h4 className="text-sm font-medium text-text-secondary mb-2">
                  STRIDE Category
                </h4>
                <StrideBadge category={threat.stride_category} showFull={true} />
              </div>

              {/* Risk Details */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-dark-tertiary rounded-lg p-3 text-center">
                  <span className="text-xs text-text-muted block mb-1">Likelihood</span>
                  <span className="text-lg font-bold text-text-primary">{threat.likelihood}/5</span>
                </div>
                <div className="bg-dark-tertiary rounded-lg p-3 text-center">
                  <span className="text-xs text-text-muted block mb-1">Impact</span>
                  <span className="text-lg font-bold text-text-primary">{threat.impact}/5</span>
                </div>
                <div className="bg-dark-tertiary rounded-lg p-3 text-center">
                  <span className="text-xs text-text-muted block mb-1">Risk Score</span>
                  <span className="text-lg font-bold text-cyber-cyan">{threat.risk_score}</span>
                </div>
                <div className="bg-dark-tertiary rounded-lg p-3 text-center">
                  <span className="text-xs text-text-muted block mb-1">Risk Level</span>
                  <RiskBadge level={threat.risk_level} showIcon={false} size="small" />
                </div>
              </div>

              {/* Mitigation */}
              <div className="bg-risk-low/5 border border-risk-low/20 rounded-lg p-4">
                <h4 className="text-sm font-medium text-risk-low mb-2 flex items-center gap-2">
                  <Lightbulb className="w-4 h-4" />
                  Recommended Mitigation
                </h4>
                <p className="text-text-primary text-sm leading-relaxed">
                  {threat.mitigation}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
