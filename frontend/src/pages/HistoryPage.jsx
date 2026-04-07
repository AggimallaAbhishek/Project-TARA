import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
// motion is used in JSX as motion.div
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, Clock, AlertTriangle, Trash2, 
  Eye, Calendar, TrendingUp, FileSearch 
} from 'lucide-react';
import { getAnalyses, deleteAnalysis } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import RiskBadge from '../components/RiskBadge';

export default function HistoryPage() {
  const [analyses, setAnalyses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  useEffect(() => {
    fetchAnalyses();
  }, []);

  const fetchAnalyses = async () => {
    try {
      const data = await getAnalyses();
      setAnalyses(data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load analyses');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteAnalysis(id);
      setAnalyses(analyses.filter((a) => a.id !== id));
      setDeleteConfirm(null);
      setActionError(null);
    } catch (deleteError) {
      console.error('Failed to delete analysis:', deleteError);
      setActionError(deleteError.response?.data?.detail || 'Failed to delete analysis');
    }
  };

  const getRiskBadgeLevel = (score) => {
    if (score >= 16) return 'Critical';
    if (score >= 10) return 'High';
    if (score >= 5) return 'Medium';
    return 'Low';
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <LoadingSpinner text="Loading history..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-risk-critical text-lg">{error}</div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-between items-center mb-8"
      >
        <div>
          <h1 className="text-3xl font-bold font-display text-text-primary">
            Analysis History
          </h1>
          <p className="text-text-secondary mt-1">
            {analyses.length} {analyses.length === 1 ? 'analysis' : 'analyses'} performed
          </p>
        </div>
        <Link to="/">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="btn-cyber flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            New Analysis
          </motion.button>
        </Link>
      </motion.div>

      {/* Empty State */}
      {analyses.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card-dark p-12 text-center"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 mb-4 rounded-xl bg-dark-tertiary">
            <FileSearch className="w-8 h-8 text-text-muted" />
          </div>
          <h3 className="text-lg font-medium text-text-primary mb-2">No analyses yet</h3>
          <p className="text-text-secondary mb-6">
            Start by analyzing your first system architecture
          </p>
          <Link to="/">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="btn-cyber inline-flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Create Analysis
            </motion.button>
          </Link>
        </motion.div>
      ) : (
        /* Analysis Cards */
        <div className="space-y-4">
          {actionError && (
            <div className="p-3 bg-risk-critical/10 border border-risk-critical/30 rounded-lg text-sm text-risk-critical">
              {actionError}
            </div>
          )}
          <AnimatePresence>
            {analyses.map((analysis, index) => (
              <motion.div
                key={analysis.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -100 }}
                transition={{ delay: index * 0.05 }}
                className="card-dark p-5 hover:border-cyber-cyan/30 transition-colors"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  {/* Left: Title and Meta */}
                  <div className="flex-1 min-w-0">
                    <Link
                      to={`/analysis/${analysis.id}`}
                      className="text-lg font-semibold text-text-primary hover:text-cyber-cyan transition-colors truncate block"
                    >
                      {analysis.title}
                    </Link>
                    <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-text-secondary">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {new Date(analysis.created_at).toLocaleDateString()}
                      </span>
                      {analysis.analysis_time > 0 && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {analysis.analysis_time.toFixed(1)}s
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <AlertTriangle className="w-4 h-4" />
                        {analysis.threat_count} threats
                        {analysis.high_risk_count > 0 && (
                          <span className="text-risk-critical">
                            ({analysis.high_risk_count} critical)
                          </span>
                        )}
                      </span>
                    </div>
                  </div>

                  {/* Right: Risk Score and Actions */}
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-3">
                      <div className="text-center px-3 py-1 bg-dark-tertiary rounded-lg">
                        <div className="text-lg font-bold text-cyber-cyan">
                          {analysis.total_risk_score.toFixed(1)}
                        </div>
                        <div className="text-xs text-text-muted">Score</div>
                      </div>
                      <RiskBadge 
                        level={getRiskBadgeLevel(analysis.total_risk_score)} 
                        showIcon={false}
                        size="small"
                      />
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <Link to={`/analysis/${analysis.id}`}>
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          aria-label={`View analysis ${analysis.title}`}
                          className="p-2 rounded-lg bg-dark-tertiary text-text-secondary hover:text-cyber-cyan transition-colors"
                        >
                          <Eye className="w-5 h-5" />
                        </motion.button>
                      </Link>
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => setDeleteConfirm(analysis)}
                        aria-label={`Delete analysis ${analysis.title}`}
                        className="p-2 rounded-lg bg-dark-tertiary text-text-secondary hover:text-risk-critical transition-colors"
                      >
                        <Trash2 className="w-5 h-5" />
                      </motion.button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-dark-primary/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setDeleteConfirm(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="card-dark p-6 max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-semibold text-text-primary mb-2">
                Delete Analysis?
              </h3>
              <p className="text-text-secondary mb-6">
                Are you sure you want to delete "{deleteConfirm.title}"? This action cannot be undone.
              </p>
              <div className="flex gap-3 justify-end">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setDeleteConfirm(null)}
                  className="btn-secondary"
                >
                  Cancel
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleDelete(deleteConfirm.id)}
                  className="px-4 py-2 bg-risk-critical text-white font-medium rounded-lg hover:bg-risk-critical/80 transition-colors"
                >
                  Delete
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
