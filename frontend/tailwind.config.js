/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        icon: {
          'primary': 'var(--color-icon-primary)',
          'secondary': 'var(--color-icon-secondary)',
        },
        bg: {
          'primary': 'var(--color-bg-primary)',
          'primary-variant': 'var(--color-bg-primary-variant)',
          'primary-surface': 'var(--color-bg-primary-surface)',
          'secondary': 'var(--color-bg-secondary)',
          'header': 'var(--color-bg-header)',
          'input': 'var(--color-bg-input)'
        },
        text: {
          'primary': 'var(--color-text-primary)',
          'secondary': 'var(--color-text-secondary)',
          'muted': 'var(--color-text-muted)'
        },
        brand: {
          'primary': 'var(--color-brand-primary)'
        }
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', 'ui-serif', 'Georgia', 'serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.15s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-in': 'slideIn 0.3s ease-out',
        'slide-out': 'slideOut 0.3s ease-in',
        'progress': 'progressBar 3s linear forwards',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideIn: {
          '0%': { transform: 'translateX(100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        slideOut: {
          '0%': { transform: 'translateX(0)', opacity: '1' },
          '100%': { transform: 'translateX(100%)', opacity: '0' },
        },
        progressBar: {
          '0%': { width: '100%' },
          '100%': { width: '0%' },
        },
      },
    },
  },
  plugins: [],
}
