import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { defineConfig } from 'vitest/config'

// Served from https://<user>.github.io/kb-plan/
const base = '/kb-plan/'

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt', // user confirms updates, no data is touched
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'KB Plan',
        short_name: 'KB Plan',
        description: '16-Wochen-Trainingsplan Kettlebell und Rad',
        lang: 'de',
        display: 'standalone',
        start_url: base,
        scope: base,
        background_color: '#ffffff',
        theme_color: '#0f766e',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: { globPatterns: ['**/*.{js,css,html,svg,png,json}'] },
    }),
  ],
  test: { environment: 'node', include: ['src/**/*.test.ts'] },
})
