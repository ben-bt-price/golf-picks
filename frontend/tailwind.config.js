/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        green: {
          950: '#0a2e0f',
          900: '#0f3d1a',
          800: '#1a5c2a',
          700: '#1e7033',
          600: '#22863d',
        },
      },
    },
  },
  plugins: [],
};
