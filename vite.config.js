import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],

  server: {
    proxy: {

      // ------------------------------------------------------
      // Node-RED API
      // ------------------------------------------------------

      '/api': {
        target: 'http://localhost:1880',
        changeOrigin: true,
      },

      // ------------------------------------------------------
      // NASA FIRMS
      // ------------------------------------------------------

      '/firms': {
        target:
          'https://firms.modaps.eosdis.nasa.gov',
        changeOrigin: true,
        rewrite: (path) =>
          path.replace(/^\/firms/, ''),
      },
    },
  },
})