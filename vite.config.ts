import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [tailwindcss(), vue(), vueDevTools()],
  server: {
    headers: { 'Cross-Origin-Opener-Policy': 'same-origin-allow-popups' },
  },
  preview: {
    headers: { 'Cross-Origin-Opener-Policy': 'same-origin-allow-popups' },
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
