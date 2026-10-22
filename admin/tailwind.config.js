/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#EEF2FF',
          100: '#E0E7FF',
          200: '#C7D2FE',
          300: '#A5B4FC',
          400: '#818CF8',
          500: '#6366F1',
          600: '#4F46E5', // Primary brand color
          700: '#4338CA',
          800: '#3730A3',
          900: '#312E81',
        },
        accent: {
          light: '#FDE68A',
          DEFAULT: '#F59E0B',
          dark: '#D97706',
        },
        dark: {
          bg: '#0B1020',
          surface: '#151B2E',
          card: '#182035',
          border: '#26304A',
          text: '#F1F5F9',
          muted: '#94A3B8',
        },
        light: {
          bg: '#F8FAFC',
          surface: '#FFFFFF',
          card: '#FFFFFF',
          border: '#E2E8F0',
          text: '#0F172A',
          muted: '#64748B',
        },
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        display: ['Poppins', 'sans-serif'],
      },
      borderRadius: {
        'card': '16px',
        'btn': '12px',
        'input': '12px',
        'sheet': '24px',
      },
    },
  },
  plugins: [],
}
