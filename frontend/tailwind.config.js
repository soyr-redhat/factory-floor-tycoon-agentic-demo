/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'redhat': {
          red: '#EE0000',
          'red-hover': '#FF3333',
          'dark-bg': '#0A0A0A',
          'dark-surface': '#151515',
          'dark-elevated': '#1F1F1F',
          'text-primary': '#FFFFFF',
          'text-secondary': '#B8B8B8',
          'text-tertiary': '#6B6B6B',
          'grid-line': 'rgba(238, 0, 0, 0.08)',
        }
      },
      fontFamily: {
        'display': ['"Red Hat Display"', 'sans-serif'],
        'text': ['"Red Hat Text"', 'sans-serif'],
        'mono': ['"JetBrains Mono"', 'monospace'],
      }
    },
  },
  plugins: [],
}
