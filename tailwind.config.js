/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        forest: {
          50:  '#f0faf5',
          100: '#dcf5e7',
          200: '#b9eacf',
          300: '#85d6ae',
          400: '#52b788',
          500: '#2d9e6b',
          600: '#1e7e52',
          700: '#196543',
          800: '#165037',
          900: '#12422e',
        },
        danger: '#e63946',
        warning: '#f4a261',
        safe: '#52b788',
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
        '4xl': '2rem',
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
