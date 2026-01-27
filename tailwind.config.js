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
        forest: {
          DEFAULT: '#1B3B2F',
          50: '#E8F0ED',
          100: '#D1E1DB',
          200: '#A3C3B7',
          300: '#75A593',
          400: '#47876F',
          500: '#2A5A47',
          600: '#1B3B2F',
          700: '#122820',
          800: '#0A1511',
          900: '#050A08',
        },
        blush: {
          DEFAULT: '#F2D4D7',
          50: '#FFFFFF',
          100: '#FBF0F1',
          200: '#F2D4D7',
          300: '#E8B8BD',
          400: '#DE9CA3',
          500: '#D48089',
          600: '#CA646F',
          700: '#B84A56',
          800: '#923A44',
          900: '#6C2B32',
        },
        // Studio colors that complement the brand
        'studio-awh': '#E85D9C',
        'studio-caa': '#4A9B8C',
        'studio-starbound': '#D4A574',
      },
      fontFamily: {
        sans: ['system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
