import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
/* eslint-disable-next-line no-unused-vars */
import { motion } from 'framer-motion';
import { 
  Sparkles, AlertCircle, User, Edit3, FileX, 
  Eye, Wifi, Shield, Clock, History, ArrowRight 
} from 'lucide-react';
import { analyzeSystem } from '../services/api';
import { FullPageLoader } from '../components/LoadingSpinner';

const TITLE_MAX_LENGTH = 255;
const DESCRIPTION_MAX_LENGTH = 5000;

export default function HomePage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const navigate = useNavigate();
  const remainingDescriptionChars = DESCRIPTION_MAX_LENGTH - description.length;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await analyzeSystem(title, description);
      navigate(`/analysis/${result.id}`);
    } catch (err) {
      console.error('Analysis failed:', err);
      setError(
        err.response?.data?.detail || 
        'Failed to analyze system. Please check if the backend is running.'
      );
      setIsLoading(false);
    }
  };

  const examples = [
    {
      title: 'E-Commerce Platform',
      description: 'Online shopping platform with user authentication, product catalog, shopping cart, payment processing via Stripe, and order management. Uses React frontend, Node.js backend, PostgreSQL database.',
    },
    {
      title: 'Healthcare Portal',
      description: 'Patient portal for viewing medical records, scheduling appointments, messaging doctors. Integrates with hospital EHR via HL7 FHIR API. OAuth 2.0 authentication, encrypted database for PHI.',
    },
    {
      title: 'Banking Mobile App',
      description: 'Mobile banking app with biometric login, account management, fund transfers, bill payments. REST API backend with 2FA, transaction signing, real-time fraud detection.',
    },
  ];

  const strideCategories = [
    { letter: 'S', name: 'Spoofing', icon: User, color: 'text-purple-400' },
    { letter: 'T', name: 'Tampering', icon: Edit3, color: 'text-blue-400' },
    { letter: 'R', name: 'Repudiation', icon: FileX, color: 'text-pink-400' },
    { letter: 'I', name: 'Info Disclosure', icon: Eye, color: 'text-cyan-400' },
    { letter: 'D', name: 'Denial of Service', icon: Wifi, color: 'text-amber-400' },
    { letter: 'E', name: 'Elevation of Privilege', icon: Shield, color: 'text-red-400' },
  ];

  if (isLoading) {
    return <FullPageLoader text="Analyzing system threats..." />;
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-10"
      >
        <h1 className="text-4xl font-bold font-display text-text-primary mb-3">
          Threat Analysis & Risk Assessment
        </h1>
        <p className="text-text-secondary text-lg">
          Describe your system architecture and let AI identify potential security threats
        </p>
      </motion.div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="lg:col-span-2"
        >
          <form onSubmit={handleSubmit} className="card-dark p-6">
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6 p-4 bg-risk-critical/10 border border-risk-critical/30 rounded-lg flex items-start gap-3"
              >
                <AlertCircle className="w-5 h-5 text-risk-critical flex-shrink-0 mt-0.5" />
                <p className="text-sm text-risk-critical">{error}</p>
              </motion.div>
            )}

            {/* Title Input */}
            <div className="mb-5">
              <label htmlFor="analysis-title" className="block text-sm font-medium text-text-secondary mb-2">
                Analysis Title
              </label>
              <input
                id="analysis-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Healthcare Patient Portal"
                maxLength={TITLE_MAX_LENGTH}
                className="input-dark"
                required
              />
            </div>

            {/* Description Input */}
            <div className="mb-6">
              <label htmlFor="system-description" className="block text-sm font-medium text-text-secondary mb-2">
                System Architecture Description
              </label>
              <textarea
                id="system-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe your system's components, technologies, data flows, and security mechanisms..."
                rows={8}
                maxLength={DESCRIPTION_MAX_LENGTH}
                className="textarea-dark"
                required
              />
              <p className="mt-2 text-xs text-text-muted flex items-center justify-between">
                The more detail you provide, the more accurate the threat analysis will be.
                <span className={remainingDescriptionChars < 200 ? 'text-risk-medium' : ''}>
                  {remainingDescriptionChars} characters left
                </span>
              </p>
            </div>

            {/* Submit Button */}
            <motion.button
              type="submit"
              disabled={!title.trim() || !description.trim()}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full btn-cyber flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Sparkles className="w-5 h-5" />
              Analyze System Threats
            </motion.button>
          </form>

          {/* Quick Examples */}
          <div className="mt-6">
            <h3 className="text-sm font-medium text-text-secondary mb-3">Quick Examples</h3>
            <div className="flex flex-wrap gap-2">
              {examples.map((example) => (
                <motion.button
                  key={example.title}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    setTitle(example.title);
                    setDescription(example.description);
                  }}
                  className="px-3 py-1.5 text-sm bg-dark-tertiary text-text-secondary rounded-lg border border-dark-border hover:border-cyber-cyan/50 hover:text-cyber-cyan transition-all"
                >
                  {example.title}
                </motion.button>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Sidebar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-6"
        >
          {/* STRIDE Info */}
          <div className="card-dark p-5">
            <h3 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5 text-cyber-cyan" />
              STRIDE Model
            </h3>
            <div className="space-y-2">
              {strideCategories.map((cat) => (
                <div
                  key={cat.letter}
                  className="flex items-center gap-3 p-2 rounded-lg bg-dark-tertiary/50"
                >
                  <span className={`font-bold ${cat.color}`}>{cat.letter}</span>
                  <cat.icon className={`w-4 h-4 ${cat.color}`} />
                  <span className="text-sm text-text-secondary">{cat.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="card-dark p-5">
            <h3 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-cyber-cyan" />
              Quick Actions
            </h3>
            <div className="space-y-3">
              <motion.button
                whileHover={{ x: 5 }}
                onClick={() => navigate('/history')}
                className="w-full flex items-center justify-between p-3 rounded-lg bg-dark-tertiary text-text-secondary hover:text-text-primary transition-colors"
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
      </div>
    </div>
  );
}
