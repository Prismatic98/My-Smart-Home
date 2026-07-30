import { cp } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import path from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { fileURLToPath, URL } from 'node:url';

/**
 * Standardschriften von pdf.js unter /pdfjs/standard_fonts/ verfügbar machen.
 *
 * PDFs müssen Helvetica, Times & Co. nicht mitliefern – jeder Betrachter hat
 * sie zu haben. pdf.js bringt sie deshalb als eigene Dateien mit; fehlen sie,
 * bleiben Rechnungen und Formulare stellenweise leer. Bei gescannten
 * Dokumenten (Bild im PDF) fällt das nicht auf, bei erzeugten sofort.
 *
 * Warum ein eigenes Plugin und nicht public/: 800 KB Schriftbinärdateien
 * gehören nicht ins Repo, und ein npm-Skript wäre unsichtbarer als diese
 * zwanzig Zeilen. Im Dev liefert die Middleware sie direkt aus node_modules,
 * im Build werden sie einmal nach dist kopiert.
 */
function pdfjsStandardFonts() {
  const source = fileURLToPath(new URL('./node_modules/pdfjs-dist/standard_fonts', import.meta.url));
  const publicPath = '/pdfjs/standard_fonts/';

  return {
    name: 'pdfjs-standard-fonts',

    configureServer(server) {
      server.middlewares.use(publicPath, (request, response, next) => {
        // Nur Dateinamen zulassen: der Pfad kommt aus einem Request und darf
        // das Schriftverzeichnis nicht verlassen.
        const name = path.basename(decodeURIComponent(request.url ?? '').split('?')[0]);
        if (!name) return next();

        const stream = createReadStream(path.join(source, name));
        stream.on('error', next);
        stream.pipe(response);
      });
    },

    async writeBundle(options) {
      const target = path.join(options.dir ?? 'dist', 'pdfjs', 'standard_fonts');
      await cp(source, target, { recursive: true });
    },
  };
}

export default defineConfig({
  plugins: [
    react(),
    pdfjsStandardFonts(),
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

        // Die App erscheint im Teilen-Menü des Systems (Android/Chromium; iOS
        // kennt Share Targets nicht). Der POST landet im Service Worker –
        // siehe public/share-target-sw.js.
        //
        // Bewusst NUR `files`: würde hier auch `text` oder `url` stehen, würde
        // die App bei jedem geteilten Link und jedem Textschnipsel angeboten,
        // obwohl die Dateiablage damit nichts anfangen kann.
        share_target: {
          action: '/share-target',
          method: 'POST',
          enctype: 'multipart/form-data',
          params: {
            files: [
              {
                name: 'files',
                // Die groben Kategorien zuerst, damit Kamera- und Scan-Apps
                // die App sicher anbieten; `*/*` fängt den Rest.
                accept: ['image/*', 'video/*', 'audio/*', 'text/*', 'application/pdf', '*/*'],
              },
            ],
          },
        },
      },
      workbox: {
        // Nur die eigenen Build-Artefakte vorhalten. Backend-Antworten haben
        // im Precache nichts verloren.
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],

        // Der Share-Target-Handler wird in den generierten Worker
        // hineingezogen. Ein eigener fetch-Listener ist der einzige Weg, an
        // einen POST aus dem Teilen-Menü zu kommen – generateSW selbst kann
        // nur GET-Routen.
        importScripts: ['/share-target-sw.js'],

        // …und gehört deshalb nicht zusätzlich in den Precache. Er kommt über
        // importScripts, nicht über eine Route.
        //
        // Der PDF-Renderer bleibt ebenfalls draußen: 430 KB, die jede
        // Installation vorab laden würde, obwohl eine Vorschau ohne Verbindung
        // zum Pi gar nicht möglich ist – die Datei selbst liegt dort. Der
        // Worker (pdf.worker.min.*.mjs) fällt schon durch globPatterns, weil
        // dort nur .js steht.
        globIgnores: ['**/node_modules/**/*', 'share-target-sw.js', 'assets/PdfPreview-*.js'],

        // SPA: unbekannte Routen aus dem Cache mit index.html beantworten
        navigateFallback: 'index.html',

        // …aber nicht /api/* und /backend/*: dahinter liegen in Produktion
        // Home Assistant bzw. das eigene Backend (Reverse-Proxy). Diese
        // Requests müssen immer ans Netz gehen.
        navigateFallbackDenylist: [/^\/api\//, /^\/backend\//],

        // WICHTIG für Uploads und Downloads: für /backend/* gibt es bewusst
        // KEINEN runtimeCaching-Eintrag. Ohne passende Route ruft der
        // Service Worker gar kein respondWith() auf, der Browser wickelt
        // diese Requests also selbst ab.
        //
        // Auch eine NetworkOnly-Route wäre hier falsch: sie würde den
        // Request durch den Worker leiten, und dabei gehen die
        // Fortschritts-Events von XMLHttpRequest.upload verloren – der
        // Upload-Balken stünde stumm auf 0 %. Range-Requests für spätere
        // Video-Vorschau würden ebenfalls durch den Worker laufen.
        // Deshalb: Liste bleibt leer.
        runtimeCaching: [],

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
    proxy: {
      // Bildet im Dev nach, was in Produktion Caddy macht: /backend zeigt auf
      // den lokalen Fastify-Server, das Präfix wird abgeschnitten. Dadurch
      // ist das Backend in beiden Umgebungen unter derselben Origin
      // erreichbar und der Client braucht keine Fallunterscheidung.
      '/backend': {
        target: 'http://127.0.0.1:3001',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/backend/, ''),
      },
    },
  },
});