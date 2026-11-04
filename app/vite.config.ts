import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // maplibre v6 טוען worker יחסי לקובץ שלו; prebundle שובר את הנתיב
  optimizeDeps: { exclude: ['maplibre-gl'] },
})
