export default {
  content: [
    './src/**/*.{html,js,svelte,ts}',
    './node_modules/@melt-ui/**/*.{html,js,svelte,ts}',
    // Exclude test files from purge
    '!./src/**/*.{test,spec}.{js,ts}',
    '!./e2e/**/*'
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Vahst brand colors
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
          950: '#172554'
        },
        secondary: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
          950: '#020617'
        },
        // Dark mode specific grays
        dark: {
          bg: '#0f172a',        // Main background
          surface: '#1e293b',   // Card/surface background
          border: '#334155',    // Border color
          muted: '#475569',     // Muted text
          hover: '#334155',     // Hover state
          selected: '#1e293b'   // Selected state
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'slide-in': 'slideIn 0.2s ease-out',
        'fade-in': 'fadeIn 0.2s ease-out',
      },
      keyframes: {
        slideIn: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        }
      }
    }
  },
  plugins: []
}