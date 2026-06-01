import { Link } from 'react-router-dom';
/* eslint-disable-next-line no-unused-vars */
import { motion } from 'framer-motion';
import { FileSearch, Plus } from 'lucide-react';

export default function HistoryEmptyState({ hasFiltersApplied }) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="ui-empty-state p-12">
      <div className="inline-flex items-center justify-center w-16 h-16 mb-4 rounded-xl bg-dark-tertiary border border-dark-border">
        <FileSearch className="w-8 h-8 text-text-muted" />
      </div>
      <h3 className="text-lg font-medium text-text-primary mb-2">
        {hasFiltersApplied ? 'No analyses match these filters' : 'No analyses yet'}
      </h3>
      <p className="text-text-secondary mb-6">
        {hasFiltersApplied ? 'Try adjusting search and filter criteria.' : 'Start by analyzing your first system architecture.'}
      </p>
      <Link to="/">
        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="btn-cyber inline-flex items-center gap-2">
          <Plus className="w-5 h-5" />
          Create Analysis
        </motion.button>
      </Link>
    </motion.div>
  );
}
