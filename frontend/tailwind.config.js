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
          'dark-bg': 'var(--bg-primary)',
          'dark-surface': 'var(--bg-surface)',
          'dark-elevated': 'var(--bg-elevated)',
          'text-primary': 'var(--text-primary)',
          'text-secondary': 'var(--text-secondary)',
          'text-tertiary': 'var(--text-tertiary)',
          'grid-line': 'rgba(238, 0, 0, var(--grid-opacity-bright))',
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
