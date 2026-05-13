import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    proxy: {
      '/orders': 'http://localhost:3000',
      '/users': 'http://localhost:3000',
      '/auth': 'http://localhost:3000',
    },
  },
})
