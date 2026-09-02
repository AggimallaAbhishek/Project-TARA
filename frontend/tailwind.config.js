/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Surfaces. Four steps only - every panel in the app maps to one of
        // these, so elevation stays legible instead of drifting per-component.
        dark: {
          primary: '#05080b',
          secondary: '#0b141a',
          tertiary: '#0f1a22',
          elevated: '#132029',
          border: '#1d3d38',
          'border-strong': '#2a6b60',
        },
        // Accents. Brightened from the previous set so each clears 4.5:1 on
        // every surface above, not just on the darkest one.
        cyber: {
          cyan: '#2dd4a7',
          'cyan-dim': '#1fae88',
          blue: '#5aa9f5',
          success: '#6fd8a8',
        },
        // Risk levels
        risk: {
          critical: '#ff5a5a',
          high: '#f7913f',
          medium: '#f0a83c',
          low: '#6fd8a8',
        },
        // Text. `muted` is the floor: the previous #3a5248 sat at 1.96:1 and
        // is gone. Nothing dimmer than `muted` may carry text.
        text: {
          primary: '#e2ece7',
          secondary: '#a8c0b6',
          muted: '#7b978b',
        },
      },
      fontFamily: {
        // Plex Sans and Plex Mono share a skeleton, so data rows read as part
        // of the same system rather than as a "technical" costume. Space
        // Grotesk supplies the console character that Plex alone lacks, and
        // stays readable in sentences where Orbitron did not.
        sans: ['"IBM Plex Sans"', 'system-ui', 'sans-serif'],
        display: ['"Space Grotesk"', '"IBM Plex Sans"', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'monospace'],
      },
      // Explicit scale. The old set clustered at 10-16px and then jumped
      // straight to 32/72/102 with nothing between; these are the only steps.
      fontSize: {
        meta: ['0.75rem', { lineHeight: '1.1rem', letterSpacing: '0.08em' }], // 12px floor
        label: ['0.8125rem', { lineHeight: '1.125rem' }], // 13
        sm: ['0.875rem', { lineHeight: '1.375rem' }], // 14
        base: ['1rem', { lineHeight: '1.6rem' }], // 16
        lead: ['1.125rem', { lineHeight: '1.75rem' }], // 18
        h4: ['1.25rem', { lineHeight: '1.75rem', letterSpacing: '-0.01em' }], // 20
        h3: ['1.5rem', { lineHeight: '2rem', letterSpacing: '-0.015em' }], // 24
        h2: ['2rem', { lineHeight: '2.375rem', letterSpacing: '-0.02em' }], // 32
        h1: ['2.625rem', { lineHeight: '3rem', letterSpacing: '-0.025em' }], // 42
        display: ['3.75rem', { lineHeight: '1.02', letterSpacing: '-0.03em' }], // 60
      },
      boxShadow: {
        // Real depth: every shadow carries a vertical offset and a soft blur.
        // The previous `0 0 24px` halos were decoration, not elevation, and
        // read as a glow effect rather than as a surface lifting off the page.
        'glow-cyan': '0 6px 20px -4px rgba(45, 212, 167, 0.30)',
        'glow-cyan-sm': '0 3px 10px -2px rgba(45, 212, 167, 0.24)',
        surface: '0 8px 22px -6px rgba(0, 0, 0, 0.55)',
        panel: '0 14px 34px -12px rgba(0, 0, 0, 0.65)',
        'inner-soft': 'inset 0 1px 0 rgba(255,255,255,0.04)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        glow: 'glow 2s ease-in-out infinite alternate',
        float: 'float 6s ease-in-out infinite',
      },
      keyframes: {
        glow: {
          // Was rgba(94, 202, 211) - a leftover blue-teal from an older
          // palette that matched no token in the system.
          '0%': { boxShadow: '0 2px 6px -2px rgba(45, 212, 167, 0.18)' },
          '100%': { boxShadow: '0 4px 16px -3px rgba(45, 212, 167, 0.38)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
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
