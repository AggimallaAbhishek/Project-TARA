import React from 'react';
/* eslint-disable-next-line no-unused-vars */
import { motion } from 'framer-motion';
import { AlertTriangle, AlertCircle, AlertOctagon, CheckCircle } from 'lucide-react';

export default function RiskBadge({ level, score, showIcon = true, size = 'default' }) {
  const getConfig = (level) => {
    switch (level?.toLowerCase()) {
      case 'critical':
        return {
          bg: 'bg-risk-critical/10',
          border: 'border-risk-critical/30',
          text: 'text-risk-critical',
          glow: 'shadow-glow-red',
          icon: AlertOctagon,
        };
      case 'high':
        return {
          bg: 'bg-risk-high/10',
          border: 'border-risk-high/30',
          text: 'text-risk-high',
          glow: 'hover:shadow-glow-red',
          icon: AlertTriangle,
        };
      case 'medium':
        return {
          bg: 'bg-risk-medium/10',
          border: 'border-risk-medium/30',
          text: 'text-risk-medium',
          glow: 'hover:shadow-glow-orange',
          icon: AlertCircle,
        };
      case 'low':
        return {
          bg: 'bg-risk-low/10',
          border: 'border-risk-low/30',
          text: 'text-risk-low',
          glow: 'hover:shadow-glow-green',
          icon: CheckCircle,
        };
      default:
        return {
          bg: 'bg-dark-tertiary',
          border: 'border-dark-border',
          text: 'text-text-secondary',
          glow: '',
          icon: AlertCircle,
        };
    }
  };

  const config = getConfig(level);
  const Icon = config.icon;
  
  const sizeClasses = {
    small: 'px-2 py-0.5 text-xs',
    default: 'px-3 py-1 text-sm',
    large: 'px-4 py-1.5 text-base',
  };

  return (
    <motion.span
      whileHover={{ scale: 1.05 }}
      className={`
        inline-flex items-center gap-1.5 rounded-full font-medium border
        transition-all duration-200
        ${config.bg} ${config.border} ${config.text} ${config.glow}
        ${sizeClasses[size]}
      `}
    >
      {showIcon && <Icon className="w-3.5 h-3.5" />}
      {level}
      {score !== undefined && (
        <span className="opacity-70 ml-0.5">({score})</span>
      )}
    </motion.span>
  );
}
