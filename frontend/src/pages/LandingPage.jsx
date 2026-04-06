import { motion } from 'framer-motion';
import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Shield, Zap, Target, Lock, ArrowRight, Sparkles } from 'lucide-react';

export default function LandingPage() {
  const features = [
    {
      icon: Shield,
      title: 'STRIDE Analysis',
      description: 'Comprehensive threat modeling using the industry-standard STRIDE methodology',
    },
    {
      icon: Zap,
      title: 'AI-Powered',
      description: 'Advanced LLM technology identifies threats in seconds, not hours',
    },
    {
      icon: Target,
      title: 'Risk Scoring',
      description: 'Automatic risk assessment with likelihood and impact calculations',
    },
    {
      icon: Lock,
      title: 'Mitigations',
      description: 'Get actionable security recommendations for each identified threat',
    },
  ];

  // Generate particles once on mount to avoid impure render
  // eslint-disable-next-line react-hooks/purity
  const particles = useMemo(() => {
    return [...Array(20)].map((_, i) => ({
      id: i,
      initialX: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 1920),
      initialY: Math.random() * (typeof window !== 'undefined' ? window.innerHeight : 1080),
      targetX: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 1920),
      targetY: Math.random() * (typeof window !== 'undefined' ? window.innerHeight : 1080),
      duration: Math.random() * 10 + 10,
    }));
  }, []);

  return (
    <div className="min-h-[90vh] flex flex-col items-center justify-center relative overflow-hidden -mt-8">
      {/* Animated background particles */}
      <div className="absolute inset-0 overflow-hidden">
        {particles.map((particle) => (
          <motion.div
            key={particle.id}
            className="absolute w-2 h-2 bg-cyber-cyan/20 rounded-full"
            initial={{
              x: particle.initialX,
              y: particle.initialY,
            }}
            animate={{
              x: particle.targetX,
              y: particle.targetY,
            }}
            transition={{
              duration: particle.duration,
              repeat: Infinity,
              repeatType: 'reverse',
            }}
          />
        ))}
      </div>

      {/* Hero Section */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="text-center z-10 px-4"
      >
        {/* Logo/Icon */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
          className="inline-flex items-center justify-center w-20 h-20 mb-6 rounded-2xl bg-gradient-to-br from-cyber-cyan/20 to-cyber-purple/20 border border-cyber-cyan/30"
        >
          <Shield className="w-10 h-10 text-cyber-cyan" />
        </motion.div>

        {/* Title */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-5xl md:text-7xl font-bold font-display mb-4"
        >
          <span className="text-text-primary">Project </span>
          <span className="text-gradient">TARA</span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="text-xl md:text-2xl text-text-secondary mb-2"
        >
          AI-Powered Threat Analysis & Risk Assessment
        </motion.p>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="text-text-muted mb-8 max-w-xl mx-auto"
        >
          Transform your system architecture into actionable security insights using 
          advanced AI and the STRIDE threat modeling framework
        </motion.p>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="flex flex-col sm:flex-row gap-4 justify-center items-center"
        >
          <Link to="/login">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="btn-cyber flex items-center gap-2 text-lg"
            >
              <Sparkles className="w-5 h-5" />
              Start Analysis
              <ArrowRight className="w-5 h-5" />
            </motion.button>
          </Link>
          
          <Link to="/login">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="btn-secondary flex items-center gap-2"
            >
              Sign In
            </motion.button>
          </Link>
        </motion.div>
      </motion.div>

      {/* Features Grid */}
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8, duration: 0.6 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-20 px-4 max-w-6xl z-10"
      >
        {features.map((feature, index) => (
          <motion.div
            key={feature.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9 + index * 0.1 }}
            whileHover={{ y: -5, borderColor: 'rgba(0, 245, 255, 0.5)' }}
            className="card-dark p-6 text-center"
          >
            <div className="inline-flex items-center justify-center w-12 h-12 mb-4 rounded-lg bg-cyber-cyan/10 text-cyber-cyan">
              <feature.icon className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-semibold text-text-primary mb-2">
              {feature.title}
            </h3>
            <p className="text-sm text-text-secondary">
              {feature.description}
            </p>
          </motion.div>
        ))}
      </motion.div>

      {/* Bottom gradient */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-dark-primary to-transparent" />
    </div>
  );
}
