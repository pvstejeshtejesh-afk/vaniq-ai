/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Vaniq brand palette
        brand: {
          50: '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5', // primary indigo
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
          navy: '#1e1b4b', // dark navy
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 3px rgba(30,27,75,0.06), 0 1px 2px rgba(30,27,75,0.04)',
        soft: '0 10px 30px -12px rgba(79,70,229,0.25)',
      },
    },
  },
  plugins: [],
};
