/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: '#14213D',
          light: '#1D2F52',
          dark: '#0E1830',
        },
        paper: '#F6F5F1',
        panel: '#FFFFFF',
        ochre: {
          DEFAULT: '#B4732E',
          light: '#D08F4A',
          dark: '#8F5A22',
        },
        slate: {
          DEFAULT: '#2B2F36',
          soft: '#5B6270',
          faint: '#8A8F99',
        },
        hairline: '#E1DFD6',
        verified: {
          DEFAULT: '#3F7A54',
          bg: '#E7F1EA',
        },
        watch: {
          DEFAULT: '#C08A2E',
          bg: '#F6EDDD',
        },
        alert: {
          DEFAULT: '#B23A34',
          bg: '#F5E4E3',
        },
      },
      fontFamily: {
        serif: ['"IBM Plex Serif"', 'Georgia', 'serif'],
        sans: ['"IBM Plex Sans"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        panel: '0 1px 2px rgba(20, 33, 61, 0.06)',
      },
    },
  },
  plugins: [],
}
