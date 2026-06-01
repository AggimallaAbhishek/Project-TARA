/* eslint-disable-next-line no-unused-vars */
import { motion } from 'framer-motion';

export default function QuickExamplesSection({ examples, onSelectExample }) {
  return (
    <div className="mt-6 rounded-lg border border-cyber-cyan/20 bg-dark-tertiary/30 p-4">
      <h3 className="text-sm font-medium text-text-secondary mb-3">Quick Examples</h3>
      <div className="flex flex-wrap gap-2">
        {examples.map((example) => (
          <motion.button
            key={example.title}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onSelectExample(example)}
            className="px-3 py-1.5 text-sm bg-dark-secondary text-text-secondary rounded-lg border border-cyber-cyan/20 hover:border-cyber-cyan/40 hover:text-text-primary transition-colors"
          >
            {example.title}
          </motion.button>
        ))}
      </div>
    </div>
  );
}
