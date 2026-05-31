import { Link } from 'react-router-dom';
/* eslint-disable-next-line no-unused-vars */
import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';

export default function HistoryHeader({ total }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex justify-between items-center mb-8"
    >
      <div>
        <h1 className="text-3xl font-bold font-display text-text-primary">Analysis History</h1>
        <p className="text-text-secondary mt-1">
          {total} {total === 1 ? 'analysis' : 'analyses'} found
        </p>
      </div>
      <Link to="/">
        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="btn-cyber flex items-center gap-2">
          <Plus className="w-5 h-5" />
          New Analysis
        </motion.button>
      </Link>
    </motion.div>
  );
}
