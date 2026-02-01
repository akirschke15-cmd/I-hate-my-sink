/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f5f5',
          100: '#d9e5e6',
          200: '#b3cbcc',
          300: '#8db1b3',
          400: '#679799',
          500: '#497174',
          600: '#3d5f61',
          700: '#324d4f',
          800: '#263b3c',
          900: '#1a2829',
          950: '#0f1617',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
