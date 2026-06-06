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
          primary: '#040709',
          secondary: '#080e14',
          tertiary: '#0d1620',
          elevated: '#131e28',
          border: '#1a4f48',
          'border-strong': '#24766b',
        },
        // Accent colors
        cyber: {
          cyan: '#00c8a0',
          'cyan-dim': '#00ae8d',
          blue: '#3898f0',
          success: '#4cc38a',
        },
        // Risk levels
        risk: {
          critical: '#e84040',
          high: '#f08c35',
          medium: '#e8a030',
          low: '#66cfa4',
        },
        // Text colors
        text: {
          primary: '#d2e0d9',
          secondary: '#9bb6ab',
          muted: '#6f9184',
        },
      },
      fontFamily: {
        sans: ['Rajdhani', 'system-ui', 'sans-serif'],
        display: ['Orbitron', 'Rajdhani', 'sans-serif'],
        mono: ['Share Tech Mono', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        'glow-cyan': '0 0 24px rgba(94, 202, 211, 0.28)',
        'glow-cyan-sm': '0 0 12px rgba(94, 202, 211, 0.2)',
        surface: '0 8px 22px rgba(5, 12, 20, 0.28)',
        'inner-soft': 'inset 0 1px 0 rgba(255,255,255,0.03)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        glow: 'glow 2s ease-in-out infinite alternate',
        float: 'float 6s ease-in-out infinite',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 5px rgba(94, 202, 211, 0.15)' },
          '100%': { boxShadow: '0 0 16px rgba(94, 202, 211, 0.35)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'cyber-grid': 'linear-gradient(rgba(94, 202, 211, 0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(94, 202, 211, 0.04) 1px, transparent 1px)',
      },
    },
  },
  plugins: [],
  // Production build optimization: safelist ensures critical utilities are preserved
  safelist: [
    // Risk level classes
    { pattern: /^bg-(risk|cyber)-(critical|high|medium|low|cyan|blue|success)/ },
    { pattern: /^text-(risk|cyber|text)-(critical|high|medium|low|cyan|cyan-dim|blue|success|primary|secondary|muted)/ },
    { pattern: /^border-(risk|cyber|text|dark)/ },
    // Animation/animation states
    'animate-pulse-slow',
    'animate-glow',
    'animate-float',
    // Common dynamic classes
    'opacity-0',
    'opacity-100',
    'scale-0',
    'scale-100',
  ],
}
