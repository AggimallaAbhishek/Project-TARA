/* eslint-disable-next-line no-unused-vars */
import { AnimatePresence, motion } from 'framer-motion';

export default function HistoryDeleteModal({ deleteConfirm, onCancel, onConfirm }) {
  return (
    <AnimatePresence>
      {deleteConfirm && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-dark-primary/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={onCancel}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="ui-panel p-6 max-w-md w-full"
            onClick={(event) => event.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-text-primary mb-2">Delete Analysis?</h3>
            <p className="text-text-secondary mb-6">
              Are you sure you want to delete "{deleteConfirm.title}"? This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={onCancel} className="btn-secondary">
                Cancel
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => onConfirm(deleteConfirm.id)}
                className="px-4 py-2 bg-risk-critical text-white font-medium rounded-lg hover:bg-risk-critical/80 transition-colors"
              >
                Delete
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
