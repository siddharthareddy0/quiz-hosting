/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'Manrope', 'ui-sans-serif', 'system-ui'],
      },
      colors: {
        ink: {
          900: '#0B1220',
          800: '#121B2E',
          700: '#1B2740',
          500: '#41506A',
          300: '#93A3BF',
          200: '#C7D2EA',
          100: '#E8EEF9',
        },
      },
      boxShadow: {
        soft: '0 10px 30px rgba(15, 23, 42, 0.08)',
        lift: '0 16px 50px rgba(15, 23, 42, 0.14)',
      },
      borderRadius: {
        xl2: '1.25rem',
      },
      backgroundImage: {
        'admin-radial':
          'radial-gradient(1200px circle at 12% 10%, rgba(59,130,246,0.18), transparent 50%), radial-gradient(900px circle at 84% 18%, rgba(16,185,129,0.14), transparent 55%), radial-gradient(1000px circle at 45% 90%, rgba(168,85,247,0.12), transparent 55%)',
      },
    },
  },
  plugins: [],
};
