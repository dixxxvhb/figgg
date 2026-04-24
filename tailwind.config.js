/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Monaspace Argon', 'IBM Plex Mono', 'Monaco', 'monospace'],
        display: ['Monaspace Neon', 'IBM Plex Mono', 'Monaco', 'monospace'],
        mono: ['Monaspace Neon', 'IBM Plex Mono', 'Monaco', 'monospace'],
        body: ['Monaspace Argon', 'IBM Plex Mono', 'Monaco', 'monospace'],
      },
    },
  },
  plugins: [],
}
