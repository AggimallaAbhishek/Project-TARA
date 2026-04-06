/* eslint-disable-next-line no-unused-vars */
import { motion } from 'framer-motion';
import { User, Edit3, FileX, Eye, Wifi, Shield } from 'lucide-react';

export default function StrideBadge({ category, showFull = true }) {
  const getConfig = (cat) => {
    switch (cat) {
      case 'Spoofing':
        return {
          bg: 'bg-purple-500/10',
          border: 'border-purple-500/30',
          text: 'text-purple-400',
          icon: User,
          initial: 'S',
        };
      case 'Tampering':
        return {
          bg: 'bg-blue-500/10',
          border: 'border-blue-500/30',
          text: 'text-blue-400',
          icon: Edit3,
          initial: 'T',
        };
      case 'Repudiation':
        return {
          bg: 'bg-pink-500/10',
          border: 'border-pink-500/30',
          text: 'text-pink-400',
          icon: FileX,
          initial: 'R',
        };
      case 'Information Disclosure':
        return {
          bg: 'bg-cyan-500/10',
          border: 'border-cyan-500/30',
          text: 'text-cyan-400',
          icon: Eye,
          initial: 'I',
        };
      case 'Denial of Service':
        return {
          bg: 'bg-amber-500/10',
          border: 'border-amber-500/30',
          text: 'text-amber-400',
          icon: Wifi,
          initial: 'D',
        };
      case 'Elevation of Privilege':
        return {
          bg: 'bg-red-500/10',
          border: 'border-red-500/30',
          text: 'text-red-400',
          icon: Shield,
          initial: 'E',
        };
      default:
        return {
          bg: 'bg-dark-tertiary',
          border: 'border-dark-border',
          text: 'text-text-secondary',
          icon: Shield,
          initial: '?',
        };
    }
  };

  const config = getConfig(category);
  const Icon = config.icon;

  return (
    <motion.span
      whileHover={{ scale: 1.05 }}
      className={`
        inline-flex items-center gap-2 px-3 py-1 rounded-lg text-sm font-medium
        border transition-all duration-200
        ${config.bg} ${config.border} ${config.text}
      `}
    >
      <span className={`
        w-5 h-5 rounded flex items-center justify-center text-xs font-bold
        ${config.bg} ${config.text}
      `}>
        <Icon className="w-3.5 h-3.5" />
      </span>
      {showFull ? category : config.initial}
    </motion.span>
  );
}
