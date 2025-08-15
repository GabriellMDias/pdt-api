import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:4495', // URL da sua API
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
