import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5176,
    proxy: {
      '/console': 'http://localhost:3000',
      '/auth': 'http://localhost:3000',
    },
  },
})
