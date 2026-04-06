/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Primary dark theme
        dark: {
          primary: '#0B0F19',
          secondary: '#121826',
          tertiary: '#1a2234',
          border: '#2a3441',
        },
        // Accent colors
        cyber: {
          cyan: '#00F5FF',
          'cyan-dim': '#00c4cc',
          purple: '#8B5CF6',
          blue: '#3B82F6',
        },
        // Risk levels
        risk: {
          critical: '#FF4D4D',
          high: '#FF6B6B',
          medium: '#FFA500',
          low: '#00FF94',
        },
        // Text colors
        text: {
          primary: '#E6EAF2',
          secondary: '#9AA4B2',
          muted: '#6B7280',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Space Grotesk', 'Inter', 'sans-serif'],
      },
      boxShadow: {
        'glow-cyan': '0 0 20px rgba(0, 245, 255, 0.3)',
        'glow-cyan-sm': '0 0 10px rgba(0, 245, 255, 0.2)',
        'glow-red': '0 0 20px rgba(255, 77, 77, 0.3)',
        'glow-orange': '0 0 20px rgba(255, 165, 0, 0.3)',
        'glow-green': '0 0 20px rgba(0, 255, 148, 0.3)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'float': 'float 6s ease-in-out infinite',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 5px rgba(0, 245, 255, 0.2)' },
          '100%': { boxShadow: '0 0 20px rgba(0, 245, 255, 0.4)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'cyber-grid': 'linear-gradient(rgba(0, 245, 255, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 245, 255, 0.03) 1px, transparent 1px)',
      },
    },
  },
  plugins: [],
}

