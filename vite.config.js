import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [react()],
  server: {
    watch: {
      ignored: [
        '**/node_modules/**',
        '**/.git/**',
        '**/release/**',
        '**/*.bin',
        '**/*.hex',
        '**/__pycache__/**',
        '!**/src/**' // src DIŞINDAKİ her şeyi yoksay
      ]
    }
  }
})