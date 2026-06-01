/* eslint-disable-next-line no-unused-vars */
import { motion } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';

import ThreatCard from '../ThreatCard';

export default function ThreatListSection({ threats }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
    >
      <div className="flex items-center justify-between mb-4">
        <h2 className="section-title flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-cyber-cyan" />
          Identified Threats ({threats.length})
        </h2>
      </div>

      <div className="space-y-4">
        {threats.map((threat, index) => (
          <ThreatCard key={threat.id} threat={threat} index={index} />
        ))}
      </div>
    </motion.div>
  );
}
