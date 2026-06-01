/* eslint-disable-next-line no-unused-vars */
import { motion } from 'framer-motion';
import { FolderKanban } from 'lucide-react';

export default function HomeSidebar({
  navigate,
  strideCategories,
  quickActionIcons,
}) {
  const { ArrowRight, Clock, History, Shield } = quickActionIcons;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="space-y-6"
    >
      <div className="card-dark p-5">
        <h3 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
          <Shield className="w-5 h-5 text-cyber-cyan" />
          STRIDE Model
        </h3>
        <div className="space-y-2">
          {strideCategories.map((cat) => (
            <div
              key={cat.letter}
              className="flex items-center gap-3 p-2 rounded-lg bg-dark-tertiary border border-dark-border/70"
            >
              <span className={`font-bold ${cat.color}`}>{cat.letter}</span>
              <cat.icon className={`w-4 h-4 ${cat.color}`} />
              <span className="text-sm text-text-secondary">{cat.name}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="card-dark p-5">
        <h3 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5 text-cyber-cyan" />
          Quick Actions
        </h3>
        <div className="space-y-3">
          <motion.button
            whileHover={{ x: 5 }}
            onClick={() => navigate('/projects')}
            className="w-full flex items-center justify-between p-3 rounded-lg bg-dark-tertiary border border-dark-border text-text-secondary hover:text-text-primary hover:bg-dark-elevated transition-colors"
          >
            <span className="flex items-center gap-2">
              <FolderKanban className="w-4 h-4" />
              View Projects
            </span>
            <ArrowRight className="w-4 h-4" />
          </motion.button>
          <motion.button
            whileHover={{ x: 5 }}
            onClick={() => navigate('/history')}
            className="w-full flex items-center justify-between p-3 rounded-lg bg-dark-tertiary border border-dark-border text-text-secondary hover:text-text-primary hover:bg-dark-elevated transition-colors"
          >
            <span className="flex items-center gap-2">
              <History className="w-4 h-4" />
              View History
            </span>
            <ArrowRight className="w-4 h-4" />
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}
