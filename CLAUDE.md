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
- Virtualisierung langer Listen: `@tanstack/react-virtual` (Effekt-Picker mit
  bis zu 243 Einträgen).

## Deployment-Umgebung
> Vollständige Bestandsaufnahme des Pi: `docs/pi-infrastruktur.md`
> (Hardware, Ports, Netzwerk, Tailscale, Dienste, bekannte Lücken).

- Raspberry Pi 5 (8 GB), NVMe-SSD, Raspberry Pi OS Lite (64-bit, Debian 13).
- Alles läuft als Docker-Container, verteilt auf ZWEI Compose-Dateien:
  - `~/docker/docker-compose.yml` — nur Home Assistant (network_mode: host),
    Config unter `~/docker/homeassistant` (direkt, kein Unterordner `config`).
  - `~/docker/my-smart-home/docker-compose.prod.yml` — App + Backend.
  Weitere Compose-Dateien gibt es auf dem Pi nicht.
- Fernzugriff + HTTPS über Tailscale (`tailscale serve` → nur die App auf :8080).
  MagicDNS-Name des Pi: `smarthome`, User: `dennis`.
- Achtung Namensauflösung: `smarthome` löst im Heimnetz über die Fritzbox ins
  LAN auf (eth0 .52 und wlan0 .51 sind beide aktiv). Ein `ssh dennis@smarthome`
  von dort läuft über den normalen sshd, NICHT über Tailscale SSH — es braucht
  also einen Key, und `sudo` scheitert still (kein TTY).
- Die App läuft als eigener Container (Dockerfile + docker-compose.prod.yml im Repo):
  Caddy liefert das gebaute `dist` auf Port 8080 aus und reicht `/api/*` per
  reverse_proxy an Home Assistant (127.0.0.1:8123) weiter — deshalb
  `network_mode: host`. Same-origin: kein CORS, kein Mixed Content.
- Prod-Konfiguration in `.env.prod` (gitignored, Vorlage `.env.prod.example`);
  die Werte gehen als Build-Args in den Vite-Build.

## Stand der Geräte-Integration
- Govee-Lampen: jetzt über die Govee-Cloud-Integration (HACS) eingebunden.
  Damit stehen zusätzlich Szenen, DIY-Effekte, Snapshots, Musikmodi,
  Zonen-Switches und Segmentsteuerung zur Verfügung. Acht Geräte, 61
  Lichtentitäten (jedes Segment ist eine eigene), 18 Selects, 16 Switches.
  Die App bildet das capability-getrieben ab – siehe eigenen Abschnitt.
- HACS: Dateien liegen seit 30.07.2026 unter
  `~/docker/homeassistant/custom_components/hacs/` (Version 2.0.5), HA erkennt
  sie. Die Einrichtung über die Weboberfläche (GitHub-Gerätecode) macht Dennis
  selbst — das ist von GitHub bewusst nicht automatisierbar.
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
- DREI Kernel-Parameter in /boot/firmware/cmdline.txt MÜSSEN aktiv bleiben —
  alle drei zielen auf dasselbe Problem (Stromsparzustände von NVMe/PCIe
  verursachen auf dem Pi 5 I/O-Fehler). Keinen davon entfernen:
  `nvme_core.default_ps_max_latency_us=0` (APST),
  `pcie_aspm=off`, `pcie_port_pm=off`.
- Pi immer sauber herunterfahren (`sudo poweroff` oder kurzer Power-Knopf-Druck).
- Home Assistant neu starten mit `docker compose stop -t 60 homeassistant` +
  `start`, NICHT mit `down`: sonst meldet der Recorder beim nächsten Start
  "could not validate that the sqlite3 database was shutdown cleanly".
- HA-Logs immer mit `--since "$(docker inspect homeassistant --format
  '{{.State.StartedAt}}')"` lesen — `docker logs` wirft sonst alle Läufe
  desselben Containers zusammen und alte Warnungen sehen aus wie neue.
  Zum Filtern des Bluetooth-Dauerfehlers: `| grep -v habluetooth`.

## Aktueller Stand
Infrastruktur steht (Pi, Docker, Home Assistant, Tailscale, Govee-Lampen).
PWA-Grundgerüst, Notizen (Dexie) und Smart-Home-Anbindung laufen.
Backend (Fastify + SQLite) mit Notizen-Sync steht, Deployment über Caddy.
Dateiablage (Upload, Dateibrowser, Download, Vorschau, Teilen) läuft.
Smart Home ist auf die capability-getriebene Architektur umgebaut: Übersicht
nach Bereich, Detailseite pro Gerät, Effekt-Picker, Segment-Editor.
Offen: Thumbnails, Papierkorb, Google-Drive-Sync, Automationen-Ansicht,
Sensoren-Dashboard – bewusst später.

## Backend
- Liegt in `server/` mit eigener package.json (Node + Fastify + better-sqlite3).
- `DB_PATH` bestimmt die SQLite-Datei; auf dem Pi ein gemountetes Verzeichnis
  (WAL legt -wal/-shm daneben, deshalb Verzeichnis statt Datei mounten).
- `FILES_ROOT` (Dateiablage) und `NOTE_IMAGES_ROOT` (Bilder aus Notizen) liegen
  beide im gemounteten `/data` und brauchen daher keinen eigenen Bind-Mount.
- `.npmrc` setzt `ignore-scripts=true`: better-sqlite3 bringt N-API-Prebuilds mit,
  npm würde wegen der binding.gyp sonst unnötig aus dem Quellcode bauen.
- Basis-Image des Servers ist `node:22-trixie-slim`. Das Prebuild verlangt
  GLIBC 2.38; Bookworm hat nur 2.36 und der Container landet in einer
  Restart-Schleife. Ein Smoke-Test im Dockerfile fängt das beim Build ab.
- Erreichbar nur über den Reverse-Proxy (`HOST=127.0.0.1`), daher ohne Auth.

## Notizen-Inhalt
- Der Body ist HTML aus TipTap (`@mantine/tiptap`), nicht mehr Klartext.
  Bestehende Notizen wurden beim Dexie-Upgrade auf v3 umgewandelt.
- Der Editor wird per `React.lazy` geladen – TipTap ist mit ~430 KB das größte
  Einzelpaket und darf nicht im Hauptbundle landen.
- Aufgabenlisten über TaskList/TaskItem; Links über die Link-Erweiterung des
  StarterKits (nur http/https/mailto, kein `javascript:`). Link-Vorschauen sind
  bewusst NICHT eingebaut – dafür müsste der Pi fremde Seiten abrufen.
- Bilder stehen im HTML nur als `<img data-image-id="…">`. Die Bytes liegen
  lokal als Blob in Dexie (`noteImages`) und auf dem Server als Datei unter
  `NOTE_IMAGES_ROOT`; Metadaten in der Tabelle `note_images`. Base64 im Body
  wäre der einfachere Weg gewesen, würde aber jeden Sync mit Megabytes belasten.
- Pull der Bilder ist faul: erst beim Anzeigen (`useNoteImage`), dann lokal
  gecacht. Push läuft im Notizen-Sync mit, Bilder vor den Notizen.
- Verwaiste Bilder räumt `reconcileNoteImages(noteId, body)` weg – nach jedem
  Speichern, Abbrechen und Löschen. Nie hochgeladene Bilder verschwinden sofort,
  bereits hochgeladene bekommen einen Tombstone für den Server.
- `pinned` (0/1) = Favorit, wird in der Liste oben einsortiert.
- In der Kachelansicht wird der Body nur als Text ausgelesen, nie als HTML
  eingesetzt.

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
- Ein Klick auf eine Datei öffnet die Vorschau, ein Klick auf einen Ordner
  betritt ihn. Markiert wird ausschließlich über die Checkbox – ein Klick kann
  nicht beides bedeuten.
- `/backend/*` ist bewusst vom Service Worker ausgenommen (kein
  runtimeCaching-Eintrag) – sonst gehen Upload-Fortschritt und Range-Requests
  kaputt.

## Dateivorschau
- Vorschau nur, wenn der Browser den Inhalt selbst darstellen kann (Bild, Video,
  Audio, Text) oder wir einen Renderer mitbringen (PDF über pdf.js). Office,
  Archive und Binärdateien bekommen bewusst keine halbgare Vorschau, sondern
  Metadaten und Download – alles andere bräuchte einen Konverter auf dem Pi.
  Die Regeln stehen in `lib/previewKind.js`, nicht in den Komponenten.
- PDF läuft über pdf.js und NICHT über `<iframe>`: Chrome auf Android hat keinen
  PDF-Betrachter für eingebettete Rahmen, dort bliebe die Vorschau leer – genau
  im Hauptfall (Scans auf dem Handy). Gezeigt wird immer nur die aktuelle Seite.
- `pdfjs-dist` (~430 KB Chunk + 1,2 MB Worker) wird per `React.lazy` erst beim
  ersten PDF geladen und ist in `vite.config.js` aus dem Precache ausgenommen:
  ohne Verbindung zum Pi gibt es sowieso nichts vorzuschauen.
- Nicht eingebettete Standardschriften (Helvetica, Times) liegen unter
  `/pdfjs/standard_fonts/`; das Plugin `pdfjs-standard-fonts` in
  `vite.config.js` liefert sie im Dev aus node_modules und kopiert sie beim
  Build nach `dist`. Ohne sie bleiben erzeugte PDFs stellenweise leer.
- `GET /files/download?inline=true` liefert dieselben Bytes mit
  `Content-Disposition: inline`. Für `<img>`/`<video>` ist das gleichgültig,
  entscheidend beim Öffnen in einem neuen Tab – mit `attachment` würde daraus
  ein Download.
- Große Dateien (Bild > 20 MB, PDF > 30 MB, Text > 512 KB) laden erst nach
  Rückfrage. Video und Audio sind absichtlich ohne Grenze: die streamen per
  Range-Request.
- Die offene Vorschau steht als `?preview=<name>` in der URL. Öffnen legt einen
  History-Eintrag an, Schließen und Blättern ersetzen ihn – damit schließt die
  Zurück-Taste auf Android die Vorschau statt die Ablage zu verlassen.

## Teilen aus anderen Apps (Web Share Target)
- Zweiter Eingang in die Ablage: die installierte App steht im Teilen-Menü des
  Systems (Android/Chromium; iOS kennt Share Targets nicht).
- Im Manifest ist bewusst nur `files` angemeldet, kein `text`/`url` – sonst
  würde die App bei jedem geteilten Link angeboten.
- Der POST auf `/share-target` erreicht das JavaScript der Seite nie. Deshalb
  fängt ihn ein eigener fetch-Listener im Service Worker ab
  (`public/share-target-sw.js`), legt die Dateien in den Cache `share-inbox-v1`
  und leitet per 303 auf `/files?share=pending` um. Cache Storage statt
  IndexedDB, weil ein Response Blob, MIME-Typ und Name schon mitbringt.
- Das Skript liegt in `public/` (fester Name, kein Hash) und kommt über
  `workbox.importScripts` in den generierten Worker. Es darf nichts aus `src/`
  importieren – Cache-Name und Kopfzeilen stehen deshalb doppelt, in
  `public/share-target-sw.js` und `src/features/files/shareTarget.js`.
- Abholen leert den Briefkasten (`takeSharedFiles`) und ist auf Modulebene
  gemerkt: sonst würde der zweite Effektlauf im StrictMode die Dateien mit
  einer leeren Liste überschreiben. Der Marker `?share=` fliegt sofort aus der
  URL, damit ein Neuladen den Dialog nicht wiederholt.
- Der Zielordner wird vor dem Upload gewählt (Ordner-Browser wie beim
  Verschieben, gemeinsame Komponente `FolderPicker`) und in localStorage
  gemerkt. Hochgeladen wird über die normale Upload-Warteschlange.
- Testbar nur im echten Build über HTTPS und nur installiert – im Dev-Server
  gibt es keinen Service Worker.

## Smart Home: capability-getriebene Architektur
> Manuelle Testanleitung für die Grenzfälle: `docs/smarthome-testanleitung.md`

- **Grundregel, gilt ausnahmslos:** *Entität hat Fähigkeit X → rendere Control
  für X.* Keine Komponente trägt einen Herstellernamen, und nirgends wird nach
  Marke, Modell oder Gerätename verzweigt. Nur so erscheint ein künftiges Gerät
  (Matter-Lampe, Zigbee-Sensor, Thermostat) automatisch sinnvoll, ohne dass
  Code angefasst werden muss.
- Zugeordnet wird ausschließlich über `supported_color_modes`,
  `supported_features`, `effect_list`, die Domain, `entity_category` und – wo
  Attribute nicht ausreichen – das **Suffix der entity_id**
  (`_scene`, `_diy_scene`, `_snapshot`, `_music_mode`). Unbekannte Suffixe
  werden nicht verworfen, sondern generisch als Select gerendert.
  Achtung Reihenfolge: `_diy_scene` endet ebenfalls auf `_scene`, spezifische
  Suffixe müssen zuerst geprüft werden (`SELECT_KINDS` in capabilities.js).
- **Registries im HAProvider:** `subscribeEntities` allein genügt nicht. Der
  Provider lädt zusätzlich `config/device_registry/list`,
  `config/entity_registry/list` und `config/area_registry/list` und stellt sie
  als Maps bereit (`devices`, `entityRegistry`, `areas`). Aktualisiert wird über
  die Events `device_registry_updated`, `entity_registry_updated`,
  `area_registry_updated` – kein Polling. Nach einem Reconnect werden sie im
  `ready`-Handler neu geholt. Die Listen liefert Home Assistant nur an Tokens
  eines Administrator-Kontos; scheitert es, steht der Grund in `registryError`.
- **Gruppierung nach Gerät, nicht nach Entität.** Home Assistant meldet über 60
  Entitäten in der Domain `light`, weil jedes LED-Segment eine eigene ist. Nach
  Entität gruppiert wären das 60 Kacheln für acht Geräte. `deviceModel.js`
  gruppiert nach `device_id`; die UI konsumiert nur dieses Modell und sieht nie
  eine rohe Entitätenliste.
- `deviceModel.js` ist absichtlich **frei von React** (Hooks liegen in
  `useDevices.js`). Dadurch lässt sich die Gruppierung gegen einen
  Registry-Abzug in Node prüfen, ohne Browser.
- **Haupt- vs. Segment-Lichtentität** entscheiden Attribute, nicht Namen: die
  Haupt-Entität hat `supported_features > 0` bzw. `color_temp`, Segmente melden
  `supported_features: 0` und nur `rgb`. Der Name (`… Segment N`) dient
  ausschließlich als Rückfallebene für die Sortierreihenfolge. Eine Entität
  gilt nur dann als Segment, wenn das Gerät zusätzlich eine stärkere
  Haupt-Entität hat – eine einfache RGB-Lampe sieht sonst genauso aus.
- Geräte ohne bedienbare Entität (Sun, Backup, HACS, Wetter, TTS) erscheinen
  nicht. Entitäten mit `entity_category` `diagnostic`/`config` sowie
  `hidden_by`/`disabled_by` gehören nicht in die Hauptansicht – Diagnose steht
  zusammengeklappt am Ende der Detailseite. Der Filter ist nicht kosmetisch: die
  Integration liefert auf jedem Gerät ein deaktiviertes `select.*_diy_style`
  ohne Zustand mit.
- Segmente haben **kein** An/Aus und **keine** Helligkeit – auch wenn Home
  Assistant die Entität nominell mit Power-State ausliefert. Dafür werden keine
  Controls gerendert.
- **Rate Limit (wichtig):** Die Govee-Cloud erlaubt 100 Anfragen pro Minute.
  Lesen ist kostenlos – alle Zustände kommen über den WebSocket-Push. Aber jede
  Aktion kostet. Deshalb laufen **alle** Schreibzugriffe über `services.js`:
  Regler (Helligkeit, Farbe, Farbtemperatur, number) sind auf 400 ms gedrosselt
  (trailing) und senden beim Loslassen final; der Segment-Farbwähler sendet erst
  auf Knopfdruck, nie während des Ziehens; Reihen (15 Segmente, „alle an/aus"
  eines Bereichs) laufen sequenziell mit Abstand und sichtbarem Fortschritt.
  Nie eine Schleife aus gleichzeitigen Service-Calls.
- Der Rest-Wert wird über das Suffix `_api_rate_limit_remaining` gefunden (keine
  feste entity_id) und nur unterhalb von 20 dezent eingeblendet.
- **Effekte anwenden:** Szenen aus `effect_list` über `light.turn_on` mit
  `effect` – das schaltet die Lampe gleich mit ein. DIY, Snapshot und
  Musikmodus über `select.select_option`; die stehen **nicht** in `effect_list`.
  Effekt beenden = Option `"None"` am Scene-Select, gerendert als eigener Knopf
  „Effekt beenden", nie als Listeneintrag.
- **Am Gerät nachgemessen (30.07.2026), Anzeige des aktiven Effekts:**
  `light.turn_on` mit `effect` füllt `light.attributes.effect` korrekt. Eine
  DIY-Szene über das Select lässt `effect` dagegen auf `null` und setzt
  `select.*_scene` auf "None" – dort ist allein das DIY-Select die
  Anzeigequelle. Ein Snapshot behält seinen Select-Wert für immer und gilt
  deshalb **nie** als „aktiver Effekt" (er ist eine einmalige Aktion). Der
  Musikmodus ist eine Einstellung, kein laufender Effekt. Diese Logik steht in
  `activeEffect()` in deviceModel.js.
- Der Effekt-Picker ist ein eigener Dialog mit Tabs, Suche und
  **virtualisiertem Raster** (`@tanstack/react-virtual`): das Pixel Light hat
  243 Szenen, ein Mantine-`Select` ist dort unbrauchbar. Favoriten und „zuletzt
  verwendet" liegen pro Gerät in Dexie (`smart-home-smarthome`) – reine
  Client-Vorlieben, kein Backend, kein Sync.
- Detailansicht als eigene Route `/smart-home/:deviceId` (nicht als
  Modal-State), damit Zurück-Taste und Deep-Links funktionieren – dieselbe
  Entscheidung wie bei der Dateivorschau.
- Nicht erreichbare Entitäten werden markiert und ihre Controls **gesperrt,
  nicht versteckt**: verschwindende Knöpfe sehen wie ein Fehler der App aus.

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
