import { motion } from 'framer-motion';

export default function LoadingSpinner({ text = 'Loading...', size = 'default' }) {
  const sizeClasses = {
    small: 'w-8 h-8',
    default: 'w-16 h-16',
    large: 'w-24 h-24',
  };

  return (
    <div className="flex flex-col items-center justify-center gap-4">
      {/* Neural network style loader */}
      <div className={`relative ${sizeClasses[size]}`}>
        {/* Outer ring */}
        <motion.div
          className="absolute inset-0 rounded-full border-2 border-cyber-cyan/30"
          animate={{ rotate: 360 }}
          transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
        />
        
        {/* Middle ring */}
        <motion.div
          className="absolute inset-2 rounded-full border-2 border-cyber-cyan/50"
          animate={{ rotate: -360 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
        />
        
        {/* Inner pulsing dot */}
        <motion.div
          className="absolute inset-0 flex items-center justify-center"
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          <div className="w-3 h-3 rounded-full bg-cyber-cyan shadow-glow-cyan" />
        </motion.div>

        {/* Orbiting dots */}
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="absolute inset-0"
            animate={{ rotate: 360 }}
            transition={{
              duration: 2 + i * 0.5,
              repeat: Infinity,
              ease: 'linear',
              delay: i * 0.3,
            }}
          >
            <div
              className="absolute w-2 h-2 rounded-full bg-cyber-cyan/70"
              style={{ top: '0%', left: '50%', transform: 'translateX(-50%)' }}
            />
          </motion.div>
        ))}
      </div>

      {/* Text */}
      {text && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-text-secondary text-sm font-medium"
        >
          {text}
        </motion.p>
      )}
    </div>
  );
}

// Full page loader variant
export function FullPageLoader({ text = 'Analyzing threats...' }) {
  return (
    <div className="fixed inset-0 bg-dark-primary/90 backdrop-blur-sm flex flex-col items-center justify-center z-50">
      {/* Animated background grid */}
      <div className="absolute inset-0 bg-cyber-pattern opacity-50" />
      
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative z-10 flex flex-col items-center"
      >
        <LoadingSpinner size="large" text="" />
        
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-8 text-center"
        >
          <h3 className="text-xl font-semibold text-text-primary mb-2">{text}</h3>
          <p className="text-text-secondary text-sm">
            Using AI to identify security threats...
          </p>
        </motion.div>

        {/* Progress dots */}
        <div className="flex gap-2 mt-6">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-2 h-2 rounded-full bg-cyber-cyan"
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                delay: i * 0.2,
              }}
            />
          ))}
        </div>
      </motion.div>
    </div>
  );
}
