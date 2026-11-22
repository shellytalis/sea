import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  // GitHub Pages מגיש מתת-נתיב (/sea/): הבנייה שם מוגדרת עם VITE_BASE=/sea/
  base: process.env.VITE_BASE ?? '/',
  plugins: [react()],
  // maplibre v6 טוען worker יחסי לקובץ שלו; prebundle שובר את הנתיב
  optimizeDeps: { exclude: ['maplibre-gl'] },
})
