/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        risk: {
          low: {
            DEFAULT: '#15803d', // green-700
            light: '#dcfce7',   // green-100
            border: '#86efac',  // green-300
            text: '#166534',    // green-800
          },
          medium: {
            DEFAULT: '#b45309', // amber-700
            light: '#fef3c7',   // amber-100
            border: '#fcd34d',  // amber-300
            text: '#92400e',    // amber-800
          },
          high: {
            DEFAULT: '#c2410c', // orange-700
            light: '#ffedd5',   // orange-100
            border: '#fdba74',  // orange-300
            text: '#9a3412',    // orange-800
          },
          critical: {
            DEFAULT: '#b91c1c', // red-700
            light: '#fee2e2',   // red-100
            border: '#fca5a5',  // red-300
            text: '#991b1b',    // red-800
          },
        },
        pharma: {
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
          950: '#020617',
        },
        trust: {
          official: {
            bg: '#1e3a8a',      // blue-900
            text: '#ffffff',
            border: '#1d4ed8',  // blue-700
          },
          unverified: {
            bg: '#fffbeb',      // amber-50
            text: '#b45309',    // amber-700
            border: '#f59e0b',  // amber-500
          },
        },
        primary: {
          DEFAULT: '#2563eb',
          foreground: '#ffffff',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        heading: ["'Tanker'", "'Bebas Neue'", 'sans-serif'],
      },
      keyframes: {
        "pulse-slow": {
          '0%, 100%': {
            transform: 'translateX(-100%)',
          },
          '50%': {
            transform: 'translateX(100%)',
          },
        },
        shimmer: {
          '100%': {
            transform: 'translateX(100%)',
          },
        },
      },
      animation: {
        "pulse-slow": "pulse-slow 3s ease-in-out infinite",
        shimmer: "shimmer 1.8s infinite",
      },
    },
  },
  plugins: [],
};
