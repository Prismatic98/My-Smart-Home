# Smart Home PWA — Projektkontext

## Ziel
Progressive Web App (React) als persönliche Smart-Home- und Alltags-Zentrale.
Self-hosted auf einem Raspberry Pi zuhause, von außen über Tailscale erreichbar.

## Geplante Module
- Datenablage: Datei-Upload von überall, Speicherung auf der lokalen SSD des Pi
- Notizen: CRUD, offline-fähig (IndexedDB), Sync mit dem Backend
- Smart Home: Steuerung & Status der Geräte über Home Assistant
- Automationen: laufen in Home Assistant; die App zeigt/schaltet sie nur
- Alexa: als Ansage-Ebene (Home Assistant → Alexa), getrieben von HA
- Govee Pixel Light: Kommunikationskanal über vordefinierte Szenen (z. B. "Wäsche fertig")

## Architektur (wichtig)
- Die PWA spricht mit (a) einem eigenen Backend (Datei-Upload, Notizen)
  und (b) Home Assistant (Geräte, Automationen).
- Home Assistant ist der zentrale Abstraktions-Hub für ALLE Geräte.
- Der App-Code spricht Geräte NICHT direkt bei den Herstellern an,
  sondern ausschließlich über die REST- und WebSocket-API von Home Assistant.

## Geplanter Tech-Stack
- Frontend: React + Vite, vite-plugin-pwa (Service Worker/Manifest/Offline),
  TanStack Query, Dexie (IndexedDB) für Offline-Notizen.
- Backend: Node + Fastify, SQLite (später ggf. Postgres),
  Datei-Uploads via multipart auf die SSD.
- Auth: einfacher Login vor die App (die App ist über Tailscale privat erreichbar).
- Styling/UI: Mantine (kein Tailwind), eigene Styles als SCSS-Module (.module.scss).

## Deployment-Umgebung
- Raspberry Pi 5 (8 GB), NVMe-SSD, Raspberry Pi OS Lite (64-bit).
- Alles läuft als Docker-Container über eine docker-compose.yml unter ~/docker.
- Home Assistant: Container mit network_mode: host, Config unter ~/docker/homeassistant.
- Fernzugriff + HTTPS über Tailscale (tailscale serve).
  SSH über Tailscale SSH. MagicDNS-Name des Pi: `smarthome`, User: `dennis`.
- App und Backend kommen als weitere Container in dieselbe docker-compose.yml.
- Die App läuft als eigener Container (Dockerfile + docker-compose.prod.yml im Repo):
  Caddy liefert das gebaute `dist` auf Port 8080 aus und reicht `/api/*` per
  reverse_proxy an Home Assistant (127.0.0.1:8123) weiter — deshalb
  `network_mode: host`. Same-origin: kein CORS, kein Mixed Content.
- Prod-Konfiguration in `.env.prod` (gitignored, Vorlage `.env.prod.example`);
  die Werte gehen als Build-Args in den Vite-Build.

## Stand der Geräte-Integration
- Govee-Lampen: über "Govee Lights Local" (lokal) eingebunden, benannt, steuerbar.
- Govee-Szenen/Pixel Light: offen, später über Govee-Cloud (HACS + API-Key).
- SmartThings/Samsung-Waschmaschine: zurückgestellt.
- Narwal Freo X Ultra (Saugroboter): keine saubere HA-Anbindung, zurückgestellt.

## Konventionen
- Kommunikation und Erklärungen auf Deutsch.
- Infrastruktur-Konfig (docker-compose.yml etc.) wird mit ins Repo versioniert.
- Frontend in JavaScript (JSX), kein TypeScript.
- Home-Assistant-Live-Zustände kommen über die WebSocket-Subscription
    (home-assistant-js-websocket, subscribeEntities) in einem React-Context –
    nicht über TanStack Query.
- TanStack Query ist für REST-artige Aufrufe ans eigene Backend reserviert.
- HA-Token liegt aktuell im Frontend (.env.local, nie committen);
  später serverseitig über das eigene Backend proxyen.

## Betriebshinweise (nicht anfassen)
- Kernel-Parameter `nvme_core.default_ps_max_latency_us=0` in /boot/firmware/cmdline.txt
  MUSS aktiv bleiben — verhindert NVMe-I/O-Fehler (APST). Nicht entfernen.
- Pi immer sauber herunterfahren (`sudo poweroff` oder kurzer Power-Knopf-Druck).

## Aktueller Stand
Infrastruktur steht (Pi, Docker, Home Assistant, Tailscale, Govee-Lampen).
PWA-Grundgerüst, Notizen (Dexie) und Smart-Home-Anbindung laufen.
Backend (Fastify + SQLite) mit Notizen-Sync steht, Deployment über Caddy.
Dateiablage (Upload, Dateibrowser, Download) läuft.
Offen: Vorschau, Thumbnails, Papierkorb, Google-Drive-Sync – bewusst später.

## Backend
- Liegt in `server/` mit eigener package.json (Node + Fastify + better-sqlite3).
- `DB_PATH` bestimmt die SQLite-Datei; auf dem Pi ein gemountetes Verzeichnis
  (WAL legt -wal/-shm daneben, deshalb Verzeichnis statt Datei mounten).
- `.npmrc` setzt `ignore-scripts=true`: better-sqlite3 bringt N-API-Prebuilds mit,
  npm würde wegen der binding.gyp sonst unnötig aus dem Quellcode bauen.
- Basis-Image des Servers ist `node:22-trixie-slim`. Das Prebuild verlangt
  GLIBC 2.38; Bookworm hat nur 2.36 und der Container landet in einer
  Restart-Schleife. Ein Smoke-Test im Dockerfile fängt das beim Build ab.
- Erreichbar nur über den Reverse-Proxy (`HOST=127.0.0.1`), daher ohne Auth.

## Notizen-Sync
- Local-first bleibt: die UI schreibt und liest ausschließlich Dexie.
  Der Abgleich ist ein Hintergrundprozess und darf nie blockieren.
- Ein Round-Trip: POST /notes/sync schickt `since` + alle `dirty`-Notizen,
  bekommt die serverseitig neueren zurück. Konflikte per last-write-wins
  über `updatedAt`.
- Löschen = `deletedAt` setzen (Tombstone), niemals die Zeile entfernen.
- Zwei Uhren strikt trennen: `updatedAt` kommt vom Client und entscheidet
  Konflikte, `since`/`serverUpdatedAt` sind Server-Zeit.
- Eine lokale Änderung bekommt immer einen Zeitstempel größer als der bisherige
  Stand der Notiz (nicht blind Date.now()).

## Dateiablage
- Dateien liegen im Dateisystem unter `FILES_ROOT` (Container `/data/files`,
  Dev `server/data/files`), nicht in der Datenbank.
- Bewusst OHNE Dexie- und Offline-Layer: Dateien sind reine Server-Daten,
  der Browser zeigt immer den echten Zustand des Pi. TanStack Query ist hier
  die einzige Datenschicht (Query-Key `['files','list',path]`).
- Endpunkte unter `/backend/files`: `GET /list`, `POST /upload`, `POST /mkdir`,
  `PATCH /rename`, `PATCH /move`, `DELETE /entry`, `GET /download`, `GET /usage`.
- Umbenennen und Verschieben sind getrennt: `/rename` ändert nur den Namen,
  `/move` nur das Verzeichnis. Zielordner wird über einen kleinen Ordner-Browser
  gewählt (kein Drag & Drop – auf dem Handy nicht bedienbar).
- **Sicherheitsregel:** Kein Pfad aus einem Request darf das Dateisystem
  erreichen, ohne durch `resolveSafePath()` (server/src/files/paths.js) gelaufen
  zu sein. Die Prüfung läuft über `path.relative` gegen die Wurzel, nicht über
  `startsWith` – sonst käme `/data/files-alt` als Treffer durch. Symlinks werden
  abgelehnt (`lstat` plus `realpath`-Gegenprobe für Verknüpfungen mitten im Pfad).
- Upload streamt in eine `.upload-<uuid>.tmp` im Zielverzeichnis und macht dann
  `rename` – halbfertige Dateien tauchen nie im Listing auf. Namenskollision
  zählt hoch (`bericht (1).pdf`), Punktdateien sind im Listing unsichtbar.
- Der aktuelle Ordner steht im URL-Parameter `?path=`, nicht im React-State.
- `/backend/*` ist bewusst vom Service Worker ausgenommen (kein
  runtimeCaching-Eintrag) – sonst gehen Upload-Fortschritt und Range-Requests
  kaputt.

## Feature-Aufbau
- Jedes Feature liegt in einem eigenen Ordner unter `src/features/<name>/`
  mit Datenzugriff (z. B. db.js + Hooks) und den zugehörigen UI-Komponenten.
- Geteiltes: `src/components` (gemeinsame Komponenten), `src/lib` (Helfer).
- Jedes Feature bindet seine eigene Route ein und ergänzt die Navigation.

## Daten & State
- Local-first: rein lokale Daten liegen in IndexedDB via Dexie.
  Reaktive Listen mit `useLiveQuery` (dexie-react-hooks).
- TanStack Query ist ausschließlich für Server-/Home-Assistant-Daten
  reserviert – NICHT für lokale IndexedDB-Daten.
- Datensätze haben konsistente Zeitfelder: `id`, `createdAt`, `updatedAt`.

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
