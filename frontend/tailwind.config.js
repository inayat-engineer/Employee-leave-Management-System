/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: 'rgb(var(--color-surface) / <alpha-value>)',
          soft: 'rgb(var(--color-surface-soft) / <alpha-value>)',
        },
        border: 'rgb(var(--color-border) / <alpha-value>)',
        text: {
          DEFAULT: 'rgb(var(--color-text) / <alpha-value>)',
          muted: 'rgb(var(--color-text-muted) / <alpha-value>)',
        },
        accent: {
          DEFAULT: 'rgb(var(--color-accent) / <alpha-value>)',
          muted: 'rgb(var(--color-accent-muted) / <alpha-value>)',
        },
      },
      boxShadow: {
        glow: '0 0 0 1px rgb(var(--color-accent) / 0.2), 0 18px 50px -24px rgb(var(--color-accent) / 0.55)',
      },
      backgroundImage: {
        'radial-grid':
          'radial-gradient(circle at top left, rgb(var(--color-accent) / var(--gradient-strength)), transparent 28%), radial-gradient(circle at bottom right, rgb(var(--color-accent-muted) / var(--gradient-strength)), transparent 30%)',
      },
    },
  },
  plugins: [],
};