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
        success: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
        },
        warning: {
          50: '#fefce8',
          100: '#fef9c3',
          200: '#fef08a',
          500: '#eab308',
          600: '#ca8a04',
        },
        error: {
          50: '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          500: '#ef4444',
          600: '#dc2626',
        },
      },
      boxShadow: {
        'soft': '0 2px 8px rgba(73, 113, 116, 0.08)',
        'soft-lg': '0 4px 16px rgba(73, 113, 116, 0.12)',
        'brand': '0 4px 12px rgba(73, 113, 116, 0.15)',
        'glow': '0 0 20px rgba(73, 113, 116, 0.2)',
      },
      backgroundImage: {
        'gradient-primary': 'linear-gradient(135deg, #497174 0%, #3d5f61 100%)',
        'gradient-subtle': 'linear-gradient(180deg, #f0f5f5 0%, #ffffff 100%)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
