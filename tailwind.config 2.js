/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        background: '#0A0E1A',
        surface: '#141929',
        'surface-elevated': '#1E2640',
        border: '#2A3250',
        primary: '#3B82F6',
        success: '#22C55E',
        destructive: '#EF4444',
        warning: '#F59E0B',
        foreground: '#F1F5F9',
        'muted-foreground': '#94A3B8',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        xs: ['11px', { lineHeight: '1.4' }],
        sm: ['13px', { lineHeight: '1.4' }],
        base: ['15px', { lineHeight: '1.5' }],
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};
