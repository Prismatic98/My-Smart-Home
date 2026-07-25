# My-Smart-Home

Progressive Web App (React + Vite) als persönliche Smart-Home- und Alltags-Zentrale.
Läuft self-hosted auf einem Raspberry Pi, von außen über Tailscale erreichbar.
Projektkontext und Konventionen stehen in [CLAUDE.md](./CLAUDE.md).

## Entwicklung

```bash
npm install
npm run dev      # Dev-Server auf http://localhost:5173 (auch im LAN/Tailscale erreichbar)
npm run build    # Produktions-Build nach dist/ inkl. Service Worker + Manifest
npm run preview  # Produktions-Build lokal testen (PWA/Offline nur hier realistisch)
```

## Struktur

```
public/                 statische Assets (PWA-Icons, favicon)
src/
  components/           wiederverwendbare UI-Bausteine (je Ordner: .jsx + .module.scss)
  features/             fachliche Module: home, notes, files, smarthome
  lib/                  Querschnitt: theme.js, queryClient.js, modules.js
  styles/               globale Styles + _mantine.scss (Sass-Breakpoints & Helfer)
  App.jsx               Routing
  main.jsx              Provider-Setup (Mantine, TanStack Query, Router)
```

## Tech-Stack

- **React 19 + Vite** (JavaScript/JSX, kein TypeScript)
- **Mantine** als UI-Framework, Dark Mode als Standard
- **SCSS-Module** (`*.module.scss`) für eigene Styles
- **TanStack Query** für Datenabruf
- **React Router** für Navigation
- **vite-plugin-pwa** für Service Worker, Manifest und Offline-Fähigkeit

Der Import-Alias `@` zeigt auf `src/`.

## Styling-Hinweise

Sass wertet `$variablen` und `rem()` bereits vor PostCSS aus. Deshalb kommen die
Mantine-Helfer in SCSS aus `src/styles/_mantine.scss` (wird über `vite.config.js`
automatisch in jede `.scss`-Datei eingebunden):

- Breakpoints: `@media (max-width: $mantine-breakpoint-sm) { ... }`
- px → rem: `px-to-rem(24px)` (statt Mantines `rem()`)
- Farben/Abstände: direkt über die CSS-Variablen, z. B. `var(--mantine-color-dark-4)`
- Hell/Dunkel: `light-dark(var(--mantine-color-gray-3), var(--mantine-color-dark-4))`