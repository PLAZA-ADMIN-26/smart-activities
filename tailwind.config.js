/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif']
      },
      colors: {
        bg: '#F2E6D8',
        card: '#E8D6C3',
        primary: '#C65A3A',
        primaryHover: '#A9472B',
        accent: '#E07A4E',
        textMain: '#2F241D',
        textSoft: '#6B5647',
        dark: {
          bg: '#1E1713',
          card: '#2A211B',
          primary: '#D77B55',
          text: '#F3E6D8',
          accent: '#F29A63'
        }
      },
      borderRadius: {
        xl2: '20px',
        xl3: '28px'
      },
      boxShadow: {
        soft: '0 4px 20px rgba(47, 36, 29, 0.08)',
        softDark: '0 4px 20px rgba(0, 0, 0, 0.35)'
      }
    }
  },
  plugins: []
}
