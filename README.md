# My-Smart-Home

Progressive Web App (React + Vite) als persönliche Smart-Home- und Alltags-Zentrale.
Läuft self-hosted auf einem Raspberry Pi, von außen über Tailscale erreichbar.
Projektkontext und Konventionen stehen in [CLAUDE.md](./CLAUDE.md).

## Entwicklung

Zwei Prozesse: Frontend und Backend. Am besten in zwei Terminals.

```bash
# Terminal 1 – Backend (Notizen-Sync)
cd server && npm install && npm run dev    # http://127.0.0.1:3001

# Terminal 2 – Frontend
npm install
npm run dev      # Dev-Server auf http://localhost:5173 (auch im LAN/Tailscale erreichbar)
npm run build    # Produktions-Build nach dist/ inkl. Service Worker + Manifest
npm run preview  # Produktions-Build lokal testen (PWA/Offline nur hier realistisch)
```

Der Vite-Dev-Server proxyt `/backend` auf `127.0.0.1:3001` und schneidet das
Präfix ab — genau wie Caddy in Produktion. Die App läuft auch ohne laufendes
Backend, sie zeigt dann nur „Sync fehlgeschlagen" an.

Kurzer Funktionstest des Backends:

```bash
curl http://127.0.0.1:3001/health
curl http://127.0.0.1:5173/backend/health     # dasselbe durch den Vite-Proxy
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

## Notizen & Sync

Die Notizen sind local-first: geschrieben wird immer nur nach IndexedDB, die
Liste liest über `useLiveQuery` direkt aus Dexie. Der Abgleich mit dem Pi läuft
davon getrennt im Hintergrund — fällt er aus, merkt man in der Bedienung nichts.

Inhaltlich können Notizen: **Rich Text** (fett, kursiv, Überschriften, Zitate,
Code), **Aufgabenlisten** zum Abhaken, **Links** und **Bilder** aus der
Zwischenablage (Strg+V) oder per Drag & Drop. Favoriten (`★`) stehen in der
Liste oben.

Der Editor ist TipTap über `@mantine/tiptap` und wird per `React.lazy` erst
geladen, wenn eine Notiz geöffnet wird — mit ~430 KB wäre er sonst der größte
Posten im Hauptbundle.

Bilder stehen im Notiz-HTML **nur als ID** (`<img data-image-id="…">`). Die
Bytes liegen getrennt: lokal als Blob in Dexie, auf dem Server als Datei unter
`NOTE_IMAGES_ROOT`. Dadurch bleibt der Notiz-Sync klein (Base64 im Body hätte
jeden Abgleich mit Megabytes belastet), Einfügen funktioniert offline, und ein
Bild wird pro Gerät genau einmal übertragen — geholt wird es erst beim Anzeigen.
Endpunkte: `POST /notes/images?id=&noteId=`, `GET /notes/images/:id`,
`DELETE /notes/images/:id`.

Link-Vorschauen gibt es bewusst nicht: dafür müsste der Pi fremde Seiten
abrufen, und ein präparierter Link könnte ihn auf interne Adressen wie
Home Assistant unter `127.0.0.1:8123` zeigen lassen.

```
UI ──schreibt──▶ Dexie ──useLiveQuery──▶ UI
                   ▲ ▼
              notesSync.js  ──POST /backend/notes/sync──▶  Fastify ──▶ SQLite
```

Ein Durchlauf ist ein einziger Round-Trip: der Client schickt seinen
Wasserstand (`since`) und alle lokal geänderten Notizen (`dirty = 1`), der
Server wendet **last-write-wins** über `updatedAt` an und antwortet mit dem,
was er Neueres hat. Ausgelöst wird beim App-Start, jede Minute, bei
Netz-Rückkehr und wenn die App wieder in den Vordergrund kommt.

Drei Details, die den Abgleich robust machen:

- **Löschen setzt `deletedAt`** statt die Zeile zu entfernen. Eine
  verschwundene Notiz ist von einer nie gesehenen nicht zu unterscheiden — ohne
  diesen Tombstone würde ein anderes Gerät sie beim nächsten Sync wieder
  hochladen.
- **Zwei Uhren, sauber getrennt.** `updatedAt` kommt vom Client und entscheidet
  Konflikte; `since` zählt dagegen in Server-Zeit (`serverUpdatedAt`). Sonst
  könnte eine falsch gehende Gerätezeit dafür sorgen, dass Änderungen nie
  ausgeliefert werden.
- **Eine Bearbeitung gewinnt immer gegen den Stand, den man vor sich hatte.**
  Läuft die Uhr eines anderen Geräts vor, wäre die eigene Änderung sonst
  rechnerisch älter und würde beim nächsten Sync kommentarlos überschrieben.

Bei zwei echt gleichzeitigen Bearbeitungen derselben Notiz geht eine Fassung
verloren — das ist der bewusste Kompromiss gegenüber echtem Merging.

`server/` hat eine eigene `package.json`. Endpunkte: `GET /health`,
`GET /notes?since=<ms>`, `POST /notes/sync`.

## Dateiablage

Dateien liegen im Dateisystem unter `FILES_ROOT` – im Container `/data/files`,
im Dev `server/data/files` (gitignored). Anders als die Notizen laufen sie
**ohne** Offline-Layer: es gibt keine lokale Kopie und keinen Abgleich, der
Browser sieht immer den echten Zustand des Pi. TanStack Query ist hier die
einzige Datenschicht.

Endpunkte unter `/backend/files`:

| Methode | Pfad | Zweck |
|---|---|---|
| `GET` | `/list?path=/foo` | Inhalt eines Verzeichnisses |
| `POST` | `/upload?path=/foo` | Multipart-Upload einer Datei |
| `POST` | `/mkdir` | Ordner anlegen |
| `PATCH` | `/rename` | Umbenennen (nur der Name) |
| `PATCH` | `/move` | In einen anderen Ordner verschieben |
| `DELETE` | `/entry?path=…` | Löschen (Ordner rekursiv) |
| `GET` | `/download?path=…` | Download, mit Range-Unterstützung (`&inline=true` für die Vorschau) |
| `GET` | `/usage` | Belegter/freier Speicher |

Jeder Pfad aus einem Request läuft durch `resolveSafePath()`
([server/src/files/paths.js](./server/src/files/paths.js)) und wird per
`path.relative` gegen die Wurzel geprüft — ein `startsWith` auf Zeichenketten
würde `/data/files-alt` durchlassen. Symlinks werden abgelehnt, auch wenn sie
mitten im Pfad stehen (dafür die `realpath`-Gegenprobe).

Uploads streamen in eine `.upload-<uuid>.tmp` im Zielverzeichnis und werden
erst per `rename` sichtbar. Halbfertige Dateien tauchen also nie im Listing
auf, und bei Namensgleichheit wird hochgezählt (`bericht (1).pdf`) statt
überschrieben.

### Vorschau

Ein Klick auf eine Datei öffnet die Vorschau, ein Klick auf einen Ordner betritt
ihn. Markiert wird nur über die Checkbox — ein Klick kann nicht beides bedeuten,
und „ansehen" braucht man viel häufiger als „auswählen".

Was angezeigt wird, entscheidet [`lib/previewKind.js`](./src/features/files/lib/previewKind.js):

| Typ | Vorschau | Warum |
|---|---|---|
| Bild | `<img>`, Original ohne Thumbnail | Serverseitiges Verkleinern bräuchte einen Bildkonverter auf dem Pi |
| PDF | pdf.js, seitenweise | `<iframe>` bleibt in Chrome auf Android leer |
| Video, Audio | `<video>`/`<audio>`, gestreamt | Range-Requests des Servers, lädt nur den benötigten Ausschnitt |
| Text, Markdown, CSV, JSON, Code | roher Text | Gerendertes Markdown würde gerade die Zeichen verschlucken, wegen derer man nachschaut |
| Office, Archive, Binärdateien | keine, nur Metadaten + Download | bräuchte einen Konverter (wie Nextcloud mit Collabora) — ein eigenes Projekt |

Große Dateien (Bild > 20 MB, PDF > 30 MB, Text > 512 KB) laden erst nach
Rückfrage: über Tailscale von unterwegs ist die Uploadleitung des Pi der
Engpass. Video und Audio haben bewusst keine Grenze, sie streamen.

`pdfjs-dist` kostet ~430 KB (Chunk) plus 1,2 MB (Worker) und wird deshalb per
`React.lazy` erst beim ersten PDF geladen — wie der Notiz-Editor. Beides ist aus
dem Precache ausgenommen: ohne Verbindung zum Pi gibt es nichts vorzuschauen.
Die Standardschriften unter `/pdfjs/standard_fonts/` liefert das Plugin
`pdfjs-standard-fonts` in [`vite.config.js`](./vite.config.js) aus; ohne sie
bleiben erzeugte PDFs (Rechnungen, Formulare) stellenweise leer.

Die offene Vorschau steht als `?preview=<name>` in der URL. Öffnen legt einen
History-Eintrag an, Schließen und Blättern ersetzen ihn — damit schließt die
Zurück-Taste auf Android die Vorschau, statt die Ablage zu verlassen. Als
Nebeneffekt ist eine Vorschau verlinkbar.

### Teilen aus anderen Apps (Web Share Target)

Die installierte App erscheint im Teilen-Menü des Systems. Ein gescanntes
Dokument aus der Kamera-App geht damit direkt in die Ablage, inklusive Auswahl
des Zielordners.

Voraussetzungen und Grenzen:

- **Android/Chromium** und die App muss **installiert** sein (Zum Startbildschirm
  hinzufügen). Im normalen Browser-Tab taucht sie im Teilen-Menü nicht auf.
- **iOS/Safari** kennt Web Share Targets nicht — dort bleibt der Weg über den
  Hochladen-Knopf.
- Angemeldet ist nur `files` (keine Texte, keine Links): die Ablage kann mit
  einem geteilten Link nichts anfangen.

Der Weg der Daten:

1. Das System schickt einen `POST multipart/form-data` an `/share-target`
   (aus `share_target.action` im Manifest, siehe `vite.config.js`).
2. Ein POST erreicht das JavaScript einer SPA nie. Deshalb fängt ihn der
   Service Worker ab ([public/share-target-sw.js](./public/share-target-sw.js)),
   legt die Dateien in den Cache `share-inbox-v1` und antwortet mit einer
   303-Weiterleitung auf `/files?share=pending`.
3. Die geladene Seite holt sie dort ab und leert den Briefkasten dabei
   ([src/features/files/shareTarget.js](./src/features/files/shareTarget.js)).
4. Der Dialog zeigt die Dateien mit Vorschau, fragt den Zielordner (gemerkt vom
   letzten Mal) und übergibt an die normale Upload-Warteschlange.

Das Skript des Service Workers liegt in `public/`, weil es unter einem festen
Namen ausgeliefert werden muss; es wird per `workbox.importScripts` in den
generierten Worker gezogen. Ein eigener `fetch`-Listener ist der einzige Weg an
einen POST — `generateSW` selbst kennt nur GET-Routen.

> **Nach einer Manifest-Änderung neu installieren.** Android macht aus
> `share_target` einen Intent-Filter in der WebAPK — **einmalig bei der
> Installation**. Eine schon installierte PWA behält ihre alte WebAPK und
> erscheint deshalb nicht im Teilen-Menü, auch wenn der Server längst das neue
> Manifest ausliefert. Chrome prüft Manifest-Änderungen nur gelegentlich (grob
> einmal täglich, und nur wenn die App gestartet wird). Verlässlich hilft nur:
> PWA deinstallieren (App-Info → Deinstallieren, nicht nur das Symbol löschen)
> und neu installieren. Kontrolle unter `chrome://webapks` — dort steht pro App
> eine „Share Target URL", die bei einer veralteten WebAPK leer ist.
>
> Das gilt für alles, was Android beim Installieren aus dem Manifest übernimmt
> (Name, Icons, `shortcuts`, `share_target`), nicht für die App selbst: neuer
> JS-Code kommt normal über den Service Worker.

**Testen** geht nur im echten Build, nicht im Dev-Server (dort ist der Service
Worker über `devOptions.enabled: false` abgeschaltet):

```bash
npm run build && npm run preview
```

Dann über Tailscale (HTTPS!) auf dem Handy öffnen, installieren und aus einer
beliebigen App etwas teilen. Ohne HTTPS gibt es keinen Service Worker und damit
kein Share Target.

### Rechte auf dem Datenverzeichnis

Der Backend-Container läuft als User `node` (uid 1000). Das gemountete
Verzeichnis muss ihm gehören, sonst scheitert schon der Start mit einer
Meldung im Log:

```bash
mkdir -p data/files
sudo chown -R 1000:1000 data
```

Der Pfad kommt aus `FILES_DATA_DIR` in `.env.prod` (Standard `./data/files`).
Soll die Ablage auf eine andere Platte, dort einen anderen Pfad eintragen und
den ebenfalls auf uid 1000 setzen.

## Deployment auf dem Pi

Zwei Container: **app** (Caddy mit der gebauten PWA) und **backend** (Fastify +
SQLite). Caddy liefert die PWA aus **und** reicht
Home Assistant unter `/api/*` sowie das Backend unter `/backend/*` durch. App und HA teilen sich damit eine Origin —
kein CORS, kein Mixed Content, und der WebSocket läuft als `wss://` über
`/api/websocket`. TLS macht Tailscale davor, Caddy selbst spricht nur HTTP auf 8080.

```
                                                          ┌─▶ /srv (dist/)            statisch
Browser ──https──▶ tailscale serve ──http:8080──▶ Caddy ──┼─▶ 127.0.0.1:8123          /api/*
                                                          └─▶ 127.0.0.1:3001          /backend/*
                                                                    │
                                                              SQLite in /data (Bind-Mount)
```

Beteiligte Dateien: [`Dockerfile`](./Dockerfile) (Build- und Serve-Stage),
[`server/Dockerfile`](./server/Dockerfile), [`Caddyfile`](./Caddyfile),
[`docker-compose.prod.yml`](./docker-compose.prod.yml),
[`.env.prod.example`](./.env.prod.example).

Einmalig auf dem Pi:

```bash
git clone <repo> ~/docker/my-smart-home && cd ~/docker/my-smart-home
cp .env.prod.example .env.prod
nano .env.prod        # VITE_HA_TOKEN eintragen, VITE_HA_URL leer lassen

mkdir -p data/files   # SQLite-Datei und Dateiablage
```

Das `mkdir` ist wichtig: der Backend-Container läuft als User `node` (uid 1000).
Legt stattdessen Docker die Mount-Verzeichnisse an, gehören sie root und der
Server kann weder die Datenbank (`SQLITE_CANTOPEN`) noch Dateien anlegen. Gehört
das Verzeichnis jemand anderem, hilft `sudo chown -R 1000:1000 data`. Wer die
Daten außerhalb des Repos haben will, setzt `BACKEND_DATA_DIR` bzw.
`FILES_DATA_DIR` in `.env.prod`.

Bauen und starten (auch für jedes Update — `--build` ist Pflicht, weil der
HA-Token zur Build-Zeit ins Bundle wandert):

```bash
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build
docker compose -f docker-compose.prod.yml --env-file .env.prod logs -f
```

Prüfen, dass alle drei Wege stehen:

```bash
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:8080/                 # 200 = PWA
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:8080/api/             # 401 = Home Assistant
curl -s http://localhost:8080/backend/health                                    # {"status":"ok",…}
curl -s http://localhost:8080/backend/files/usage                               # {"totalBytes":…}
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

`network_mode: host` bei beiden Containern ist nötig, damit Caddy Home Assistant
unter `127.0.0.1:8123` und das Backend unter `127.0.0.1:3001` erreicht — der
HA-Container läuft selbst im Host-Netz. Deshalb gibt es auch kein
`ports:`-Mapping; Caddy belegt Port 8080 des Pi direkt. Das Backend lauscht
dabei ausdrücklich nur auf `127.0.0.1` (`HOST` in der Compose-Datei), sonst
hinge es im Host-Netz offen im LAN — erreichbar sein soll es nur über Caddy.

Die Notizen-Datenbank liegt unter `${BACKEND_DATA_DIR}` (Standard `./data`) und
wird als **Verzeichnis** gemountet, nicht als einzelne Datei: SQLite legt im
WAL-Modus `notes.db-wal` und `notes.db-shm` daneben. Sichern heißt also alle
drei Dateien sichern — oder bei gestopptem Container einfach das Verzeichnis.

### Wenn statt der App „Unable to connect to Home Assistant" erscheint

Diese Meldung kommt aus HAs eigenem Frontend, nicht aus dieser App (die meldet
deutsch). Zeigte `tailscale serve` vorher auf Port 8123, hat Home Assistant unter
derselben Origin seinen Service Worker registriert — der beantwortet Aufrufe
weiter aus seinem Cache und fragt den Server gar nicht mehr. Prüfen mit
`curl -s http://localhost:8080/ | head -c 400` (muss `<title>Smart Home</title>`
enthalten); liegt es am Browser, hilft *Clear site data* inkl. „unregister
service workers" bzw. ein privates Fenster als Gegentest.

## Struktur

```
public/                 statische Assets (PWA-Icons, favicon)
src/
  components/           wiederverwendbare UI-Bausteine (je Ordner: .jsx + .module.scss)
  features/             fachliche Module: home, notes, files, smarthome
    notes/              db.js (Dexie) · notesRepository.js (einziger Dexie-Zugriff)
                        notesSync.js + useNotesSync.js (Abgleich) · NotesSyncWorker.jsx
  lib/                  Querschnitt: theme.js, queryClient.js, modules.js,
                        homeassistant.js + HAProvider.jsx (HA-Verbindung),
                        backend.js (eigenes Backend)
  styles/               globale Styles + _mantine.scss (Sass-Breakpoints & Helfer)
  App.jsx               Routing
  main.jsx              Provider-Setup (Mantine, TanStack Query, Router)
server/                 eigenes Backend, eigene package.json
  src/db.js             SQLite öffnen + Schema
  src/notesRepository.js  SQL, last-write-wins
  src/routes/           notes.js, health.js
  src/app.js            Fastify-Instanz (ohne listen – für Tests)
  src/server.js         Einstiegspunkt, Env-Konfiguration
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