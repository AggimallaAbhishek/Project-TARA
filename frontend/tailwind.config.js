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
          primary: '#0b1320',
          secondary: '#111d2d',
          tertiary: '#17283d',
          elevated: '#20334a',
          border: '#2d425b',
          'border-strong': '#3d5673',
        },
        // Accent colors
        cyber: {
          cyan: '#5ecad3',
          'cyan-dim': '#3ba5af',
          blue: '#6d99c7',
          success: '#4cc38a',
        },
        // Risk levels
        risk: {
          critical: '#ff6f72',
          high: '#ff9a62',
          medium: '#f4c15d',
          low: '#66cfa4',
        },
        // Text colors
        text: {
          primary: '#eef4fb',
          secondary: '#bed0e3',
          muted: '#8fa4bc',
        },
      },
      fontFamily: {
        sans: ['IBM Plex Sans', 'system-ui', 'sans-serif'],
        display: ['Manrope', 'IBM Plex Sans', 'sans-serif'],
        mono: ['IBM Plex Mono', 'ui-monospace', 'monospace'],
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
}
