import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon-180x180.png'],
      manifest: {
        name: 'Smart Home',
        short_name: 'Smart Home',
        description: 'Persönliche Smart-Home- und Alltags-Zentrale',
        lang: 'de',
        dir: 'ltr',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#101113',
        theme_color: '#101113',
        categories: ['productivity', 'utilities'],
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        // SPA: unbekannte Routen aus dem Cache mit index.html beantworten
        navigateFallback: 'index.html',
        // …aber nicht /api/*: dahinter liegt in Produktion Home Assistant
        // (Reverse-Proxy). Diese Requests müssen immer ans Netz gehen.
        navigateFallbackDenylist: [/^\/api\//],
        cleanupOutdatedCaches: true,
      },
      devOptions: {
        // Auf true setzen, wenn du das Offline-Verhalten im Dev-Server testen willst.
        enabled: false,
        type: 'module',
      },
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  css: {
    preprocessorOptions: {
      scss: {
        // Breakpoints & Helfer-Funktionen in jede .scss-Datei einblenden,
        // damit man sie nicht überall manuell importieren muss.
        additionalData: (source, filename) =>
          filename.endsWith('_mantine.scss') ? source : `@use "@/styles/mantine" as *;\n${source}`,
      },
    },
  },
  server: {
    // Damit der Dev-Server auch aus dem Tailscale-Netz erreichbar ist
    host: true,
    port: 5173,
  },
});