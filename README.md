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

## Home Assistant konfigurieren

`.env.example` nach `.env.local` kopieren und ausfüllen (die Datei ist gitignored):

```
VITE_HA_URL=http://smarthome:8123
VITE_HA_TOKEN=<Long-Lived Access Token aus HA → Profil → Sicherheit>
```

Vite liest env-Dateien nur beim Start — nach Änderungen den Dev-Server neu starten.

Zwei Dinge zu beachten:

- `VITE_*`-Variablen landen im Client-Bundle. Wer die App aufrufen kann, hat damit
  auch den HA-Token. Vertretbar, solange die App nur privat über Tailscale erreichbar ist.
- Läuft die App über HTTPS (`tailscale serve`), darf Home Assistant nicht als `http://`
  eingebunden sein — der Browser blockiert die Mischung (Mixed Content). In Produktion
  löst der Reverse-Proxy das (siehe unten), im Dev-Server ist HTTP ohne HTTPS unkritisch.

## Deployment auf dem Pi

Ein Container, zwei Aufgaben: Caddy liefert die gebaute PWA aus **und** reicht
Home Assistant unter `/api/*` durch. App und HA teilen sich damit eine Origin —
kein CORS, kein Mixed Content, und der WebSocket läuft als `wss://` über
`/api/websocket`. TLS macht Tailscale davor, Caddy selbst spricht nur HTTP auf 8080.

```
Browser ──https──▶ tailscale serve ──http:8080──▶ Caddy ──┬─▶ /srv (dist/)
                                                          └─▶ 127.0.0.1:8123 (Home Assistant)
```

Beteiligte Dateien: [`Dockerfile`](./Dockerfile) (Build- und Serve-Stage),
[`Caddyfile`](./Caddyfile), [`docker-compose.prod.yml`](./docker-compose.prod.yml),
[`.env.prod.example`](./.env.prod.example).

Einmalig auf dem Pi:

```bash
git clone <repo> ~/docker/my-smart-home && cd ~/docker/my-smart-home
cp .env.prod.example .env.prod
nano .env.prod        # VITE_HA_TOKEN eintragen, VITE_HA_URL leer lassen
```

Bauen und starten (auch für jedes Update — `--build` ist Pflicht, weil der
HA-Token zur Build-Zeit ins Bundle wandert):

```bash
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build
docker compose -f docker-compose.prod.yml --env-file .env.prod logs -f app
```

Compose löst `${...}` bei *jedem* Unterkommando auf, `--env-file .env.prod`
gehört also überall dran — auch an `logs`, `ps` oder `down`. Wer sich das
sparen will, setzt es einmal pro Shell (`COMPOSE_ENV_FILES` ab Compose 2.24):

```bash
export COMPOSE_FILE=docker-compose.prod.yml
export COMPOSE_ENV_FILES=.env.prod
docker compose up -d --build     # ab jetzt ohne Flags
```

Nach außen freigeben:

```bash
sudo tailscale serve --bg 8080     # HTTPS auf 443 → localhost:8080
tailscale serve status
```

`VITE_HA_URL` bleibt leer: die App nimmt dann zur Laufzeit die eigene Origin,
funktioniert also unter dem Tailscale-Namen genauso wie unter `http://smarthome:8080`.
Nur wenn Home Assistant ausnahmsweise direkt (ohne Proxy) angesprochen werden soll,
wird die Variable gesetzt.

`network_mode: host` ist nötig, damit Caddy Home Assistant unter `127.0.0.1:8123`
erreicht — der HA-Container läuft selbst im Host-Netz. Deshalb gibt es auch kein
`ports:`-Mapping; Caddy belegt Port 8080 des Pi direkt.

## Struktur

```
public/                 statische Assets (PWA-Icons, favicon)
src/
  components/           wiederverwendbare UI-Bausteine (je Ordner: .jsx + .module.scss)
  features/             fachliche Module: home, notes, files, smarthome
  lib/                  Querschnitt: theme.js, queryClient.js, modules.js,
                        homeassistant.js + HAProvider.jsx (HA-Verbindung)
  styles/               globale Styles + _mantine.scss (Sass-Breakpoints & Helfer)
  App.jsx               Routing
  main.jsx              Provider-Setup (Mantine, TanStack Query, Router)
```

## Tech-Stack

- **React 19 + Vite** (JavaScript/JSX, kein TypeScript)
- **Mantine** als UI-Framework, Dark Mode als Standard
- **SCSS-Module** (`*.module.scss`) für eigene Styles
- **Dexie** (IndexedDB) für die lokalen Notizen
- **home-assistant-js-websocket** für Live-Zustände und Service-Aufrufe
- **TanStack Query** reserviert für die spätere Backend-Anbindung
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