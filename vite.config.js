import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'


export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:1880',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '')
      },
      '/firms': {
        target: 'https://firms.modaps.eosdis.nasa.gov',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/firms/, '')
      }
    }
  }
})

