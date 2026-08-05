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
- Govee-Szenen/Pixel Light: steht. Szenen, DIY-Effekte, Snapshots und
  Musikmodi kommen über die Govee-Cloud-Integration und sind in der App über
  den Effekt-Picker bedienbar. Das Pixel Light hat 243 Szenen.
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
Klarblick ist vollständig: Gedankenprotokoll (sechs Schritte nach dem
Arbeitsblatt aus der Sitzung), Denkfehler-Katalog, Sync und Komplettlöschung.
Weitere Arbeitsblätter sind gestrichen, nicht verschoben — siehe eigenen
Abschnitt. **Vor echten Daten: App-Login und verschlüsseltes restic-Backup.**
Offen im Rest der App: Thumbnails, Papierkorb, Google-Drive-Sync,
Automationen-Ansicht, Sensoren-Dashboard – bewusst später.

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

## Notizen: zwei Arten
- Eine Notiz hat ein `kind`: **`text`** (Textdokument, HTML aus TipTap im Body)
  oder **`list`** (Checkliste, JSON im Body – siehe `lib/noteList.js`).
  Dexie v4 und die Server-Spalte `kind` (Standard `'text'`) bringen das mit;
  `kind` steht beim Anlegen fest und ändert sich nie.
- **Die Einträge einer Liste stehen im vorhandenen `body`, nicht in einer
  eigenen Tabelle.** Der Sync behandelt `body` als undurchsichtige Zeichenkette
  und löst Konflikte per last-write-wins über `updatedAt`. Eine eigene Tabelle
  bräuchte ein zweites Sync-Protokoll samt eigener Tombstones – und weil man
  eine Liste ohnehin als Ganzes bearbeitet, gewönne man dadurch nichts.
- `parseList()` fällt bei unbrauchbarem Body auf „Zeilen als Einträge" zurück,
  statt eine leere Liste zu liefern. Ein leeres Ergebnis würde beim nächsten
  Speichern den echten Inhalt überschreiben.
- **Der Listen-Editor kennt kein Abbrechen:** jede Änderung (Haken, Eintrag,
  Umbenennen, Löschen) wird sofort geschrieben. Eine Liste hakt man im
  Vorbeigehen ab; wer den Dialog über die Zurück-Taste verlässt, darf nicht
  fünf gesetzte Haken verlieren. Nur der Titel wird lokal gehalten und beim
  Verlassen des Feldes geschrieben – ein Sync-Eintrag pro Tastendruck wäre
  sinnlose Last.
- Weil der Editor eine Notiz zum Anhängen braucht, legt „Neue Liste" sie sofort
  an. Bleibt sie beim Schließen ohne Titel und ohne Einträge, wird sie wieder
  gelöscht – dasselbe Aufräummuster wie `reconcileNoteImages()`.
- Sortierung: offene Punkte in Eingabereihenfolge, erledigte darunter, zuletzt
  Abgehaktes oben. So landet das gerade angetippte Kästchen direkt unter den
  offenen Punkten und ein Versehen ist ohne Scrollen zurückzunehmen.
- Kein Drag & Drop zum Umsortieren – dieselbe Begründung wie in der Dateiablage
  (auf dem Handy nicht bedienbar).
- **Der Listen-Editor bleibt karg.** Titel, Eingabefeld, Einträge – mehr nicht.
  Fortschrittsbalken, Zähler und Zeitstempel waren drin und sind bewusst wieder
  raus: eine Liste wird im Vorbeigehen bedient, jede zusätzliche Anzeige
  verdrängt genau das, worum es geht. Favorit und Löschen sitzen im Menü der
  Kachel und werden im Editor nicht wiederholt. Nichts davon ohne Rückfrage
  wieder ergänzen.
- `summarizeList()` liefert bewusst dieselbe Form wie `summarizeNoteBody()`,
  damit `NoteCard` beide Arten ohne Verzweigung rendern kann.

## Notizen-Inhalt
- Der Body eines Textdokuments ist HTML aus TipTap (`@mantine/tiptap`), nicht
  Klartext. Bestehende Notizen wurden beim Dexie-Upgrade auf v3 umgewandelt.
- Die Formatierungsknöpfe sind **standardmäßig eingeklappt** und werden über
  einen Umschalter in der Werkzeugleiste eingeblendet. Die meisten Notizen sind
  schlichter Text; auf dem Handy fraßen zwei Reihen Werkzeuge den halben
  sichtbaren Bereich, bevor das erste Wort geschrieben war.
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
- **Erreichbarkeit** ist allein `isUnavailable()` – der Zustand `unavailable`
  bzw. `unknown` der Entität. `isReachable()` in deviceModel.js bündelt die
  Frage an einer Stelle, damit Kachel und Detailseite nicht auseinanderlaufen.
  Eine weitergehende Erkennung („Lampe ohne Strom, obwohl HA sie als an
  meldet") wurde versucht und **bewusst wieder entfernt**. Zwei Signale wurden
  am 04.08.2026 gegen den echten Bestand gemessen und taugen beide nicht;
  nicht erneut versuchen, ohne vorher zu messen:
  - Die Transport-Attribute desselben Sensors (`lan_available`, `ble_available`).
    `lan_available` flappt: dieselben zwei Lampen meldeten um 07:23 `false` und
    um 11:16 `true`, ohne dass physisch etwas passiert war – der Wert hängt nur
    daran, ob die letzte LAN-Abfrage zufällig eine Antwort bekam. Außerdem
    können manche Geräte gar kein LAN (TV) und funktionieren trotzdem.
  - Das Alter von `last_reported` der Lichtentität. Es bewegt sich **nur**,
    wenn das Gerät geschaltet wurde; der turnusmäßige Poll schreibt die
    Entität nicht neu. „Alt" heißt „unverändert", nicht „nicht erreichbar".
  Damit bleibt offen: meldet die Hersteller-Cloud für eine stromlose Lampe
  weiterhin `online: true`, hat auch Home Assistant selbst kein Signal – die
  App kann dann nichts erkennen, was HA nicht erkennt.
- **Effekt-Vorschau:** `effectColors.js` leitet aus dem Szenennamen eine
  Farbfläche ab (`EffectSwatch`), weil die Datenquelle zu Szenen keine Bilder
  liefert. Bewusste Ausnahme von „nichts annehmen": gedeutet werden gewöhnliche
  englische Wörter („Forest", „Sunset", „Mars"), keine Hersteller oder Modelle.
  Trifft nichts zu, entsteht aus dem Namen ein stabiler, aber **blasser**
  Verlauf (`opacity: 0.5`) – erkennbar wiedererkennbar, ohne eine Lichtfarbe zu
  behaupten. Trefferquote über alle 464 vorhandenen Szenen- und DIY-Namen: 92 %;
  der Rest sind eigene DIY-Namen wie „Neuer Effekt" oder „ZDP Duo".
  Die Reihenfolge in `PALETTES` ist bedeutsam – gesucht wird per
  Teilzeichenkette, „Night Light" enthält „night", „Hot Air Balloon" enthält
  „hot". Spezielleres muss zuerst stehen.
- Sperren heißt hier auch: keine verlorenen Aufrufe. Jeder Service-Call an ein
  totes Gerät kostet Kontingent der Cloud-API, ohne etwas zu bewirken. Deshalb
  reichen Kachel und Detailseite ein `disabled` an **alle** Bedienelemente
  durch (LightControls, SwitchGroup, SelectControl, NumberControl,
  SegmentEditor, Buttons), zusätzlich zu deren eigener Entitätsprüfung.
- **Mantine v9:** `Collapse` heißt die Prop `expanded`, nicht mehr `in`. Mit
  `in={…}` bleibt der Bereich für immer zu – der Umschalter reagiert, der
  Inhalt erscheint nie. Genau das hatte Segment-Editor und Diagnose-Panel
  lahmgelegt. Bei Mantine-Updates auf solche Prop-Umbenennungen achten: ohne
  TypeScript fällt das weder im Build noch im Lint auf.
- Segmentfelder bekommen **immer** einen sichtbaren Rahmen und setzen
  `--segment-color` nur, wenn die Entität wirklich eine Farbe meldet. Die
  Segmente stehen sehr oft auf reinem Weiß; ohne Rahmen ist der Streifen auf
  der hellen Karte unsichtbar. Ohne gemeldete Farbe wird schraffiert – „keine
  Farbe bekannt" darf nicht wie „Grau eingestellt" aussehen.

## Smart Home: bekannte Grenzen der Govee-Integration
> Stand 04.08.2026, Integration `lasswellt/govee-homeassistant` 2026.7.8.
> Das sind Grenzen der Datenquelle, keine offenen Aufgaben in der App.

- **Zonen-Schalter melden nichts zurück.** `switch.*_main_light`,
  `*_background_light`, `*_side_light`, `*_bottom_light` sind in der
  Integration `RestoreEntity` mit optimistischem `_is_on`
  (`GoveeLightZoneSwitchEntity`/`GoveeNamedLightSwitchEntity`): der Wert ändert
  sich nur durch eigenes Schalten und wird über Neustarts hinweg wiederhergestellt.
  Home Assistant selbst meldet also „aus", solange nicht einmal geschaltet
  wurde – die App zeigt das korrekt an. Nicht in der App reparierbar.
- **Segmente hat nicht jedes Gerät.** Echte Segment-Entitäten gibt es nur bei
  Badezimmer (15), Flur (15), Schreibtisch (15) und Stehlampe (8).
  Wohnzimmer, Schlafzimmer, TV und Pixel Light haben keine – deren SKU gibt
  über die API keine Segmentsteuerung her. Bei ihnen fehlt der Segment-Abschnitt
  deshalb zu Recht.
- **Keine Bilder zu Szenen.** Die Developer-API liefert je Szene nur `id` und
  `name` (`get_dynamic_scenes`/`get_diy_scenes`, ausgewertet in select.py);
  in der gesamten Integration existiert kein Feld für Bild, Thumbnail oder URL.
  Die Kachelbilder der Govee-App stammen aus deren interner App-API und sind
  weder dokumentiert noch über Home Assistant erreichbar. Deshalb die
  Namensdeutung in `effectColors.js` – nicht erneut nach einer Bildquelle
  suchen.
- **Befehle laufen meist über die Cloud, nicht über LAN.** Die Rangfolge in
  `async_control_device` ist BLE > LAN > MQTT > REST. Tatsächlich greift
  fast immer REST:
  - BLE: für kein Gerät verfügbar (`ble_available: false` überall).
  - LAN: ein Schreibvorgang gilt nur als erfolgreich, wenn das Gerät ihn
    innerhalb von `LAN_WRITE_CONFIRM_TIMEOUT` (0,5 s) per Rücklesen bestätigt.
    Bleibt das aus, fällt der Befehl auf REST zurück – die halbe Sekunde ist
    dann **zusätzlich** verloren. Genau daher die spürbaren Hänger.
    Achtung: `lan_available` beschreibt nur das **Lesen**; LAN-*Steuerung* ist
    etwas anderes und muss in der Govee-App je Gerät freigeschaltet sein
    (und wird nicht von jedem Modell unterstützt).
  - MQTT: abgeschaltet. `enable_mqtt_control` ist nicht gesetzt (Standard aus)
    und bräuchte zusätzlich E-Mail + Passwort im Config-Entry – dort steht nur
    `api_key`, deshalb `mqtt_last_failure_reason: not_configured`.
  - Am 04.08.2026 gemessen: Wohnzimmer wurde um 09:11 über LAN geschaltet,
    Stehlampe (08:58) und Schreibtisch (09:12) über die Cloud.
  Nachprüfbar über die Attribute `cloud_api_last_sent` und `lan_last_sent` am
  Connectivity-Sensor. Die App hat darauf keinen Einfluss: sie ruft
  HA-Services auf, die Transportwahl trifft allein die Integration.

## Klarblick (Gedankenprotokoll)
> Fachliche Herleitung: `docs/clarity-fachliche-grundlagen.md`
> Manuelle Testanleitung: `docs/clarity-testanleitung.md`

- **Anzeigename „Klarblick", Route und Code `clarity`.** Ordner
  `src/features/clarity/`, Dexie-DB `smart-home-clarity`, Backend
  `server/src/clarity/`, Endpunkte unter `/backend/clarity/*`, SQLite-Tabelle
  `clarity_records`.
- **Was das Modul ist:** ein digitales Gedankenprotokoll für die ambulante
  Verhaltenstherapie, plus den Denkfehler-Katalog als Nachschlagewerk. Es
  stellt Fragen und speichert Antworten.
- **Der Umfang ist bewusst genau das.** Verhaltensexperiment,
  Sicherheitsverhalten-Inventar, Expositionsleiter, täglicher Check-in und
  Sitzungsnotizen waren geplant und sind am 05.08.2026 wieder gestrichen
  worden – nicht verschoben. Ihre Tabellen sind mit Dexie v2 entfernt (siehe
  db.js). Nichts davon ohne Rückfrage wieder ergänzen.
- **Was es ausnahmslos nicht ist** – das sind Festlegungen, keine offenen
  Aufgaben, und nichts davon ohne Rückfrage ergänzen:
  - kein Diagnosewerkzeug: keine Fragebögen (SPIN, LSAS, PHQ-9, GAD-7 und
    Vergleichbares sind bewusst draußen), keine Scores, keine Grenzwerte
  - kein Ratgeber und kein Coach: keine Empfehlungen, keine Streaks, keine
    Abzeichen, keine Wochen-Fortschrittsbalken, keine Mahnung bei fehlenden
    Tagen, kein „Gut gemacht!" nach dem Absenden
  - keine automatische Zuordnung von Denkfehlern zu eingegebenem Text
  - keine Krisenerkennung: keine Schlagwortanalyse, keine Schwellenwerte auf
    den Reglern, keine automatischen Einblendungen
  Der Grund ist für alle Punkte derselbe: sobald die App bewertet, wird sie zu
  einer weiteren Instanz, vor der man bestehen muss. Genau das ist bei sozialer
  Angst das Problem.
- **Wortwahl:** „Therapie", „Störung", „Symptom", „Patient" und „Behandlung"
  kommen in der Oberfläche nicht vor – die App wird in der Bahn und im Büro
  geöffnet. Du-Form, Alltagssprache, Fachbegriff höchstens als Sekundärtext.
- **Urheberrecht:** Aufbau, Reihenfolge und Inhalt der Fragen folgen dem
  Arbeitsblatt aus der Sitzung (Beck, Gedankenprotokoll). Die Methode ist
  Fachallgemeingut, **der Wortlaut des Blattes nicht.** Alle Beschriftungen,
  Fragen und Denkfehler-Beschreibungen stehen eigenständig formuliert unter
  `src/features/clarity/content/` bzw. in `lib/thoughtRecord.js`. Nichts davon
  abtippen, nichts aus dem Web nachziehen, keine Scans ins Repo.
- Alle Intensitäts- und Glaubensangaben sind Ganzzahlen 0–100 – die Skala des
  Blattes und dieselbe, die in der Sitzung benutzt wird. Keine 1–10-Skalen,
  keine Sterne. `null` heißt „nicht angegeben" und ist etwas anderes als 0.
- Rot ist für Fehler und die Komplettlöschung reserviert, nie für hohe
  Angstwerte. Ein hoher Wert ist ein hoher Wert, keine schlechte Nachricht.

### Klarblick: Datenschicht
- **Eine synchronisierte Tabelle:** `thoughtRecords`. Dazu `meta`
  (Wasserstand). Mehr ist es nicht.
- `model.js` ist absichtlich **frei von React und Dexie** – dieselbe Trennung
  wie bei `deviceModel.js`. Dadurch lassen sich Record-Form und Wertebereiche
  in Node gegen den Server prüfen, ohne Browser. Dasselbe gilt für
  `lib/thoughtRecord.js` (Schritte, Zusammenfassung, Datumsumwandlung).
- Repository und Sync sind **generisch über den Tabellennamen** geschrieben,
  obwohl es nur eine gibt. Das aufzulösen brächte nur Zeilen, die bei einer
  zweiten Datenart wieder entstehen müssten.
- **Der Denkfehler-Katalog liegt als Konstante im Code** (`content/
  distortions.js`), nicht in der Datenbank – Nachschlagewerk, keine
  Nutzerdaten. Wird nie synchronisiert und braucht keine Tombstones.
- Unterlisten (Gedanken, Gefühle) stehen im Datensatz selbst und bekommen
  keine eigene Tabelle – dieselbe Überlegung wie bei den Checklisten-Notizen.
- **Dexie v1 → v2:** v1 hatte sieben Tabellen. v2 entfernt sechs davon plus
  `contacts` (`table: null`) und löscht damit ihren Inhalt. Das ist hier
  richtig und nicht nur bequem: liegen zu lassen, was niemand mehr anzeigen
  kann, widerspricht dem Umgang mit diesen Daten. Die v1-Deklaration bleibt
  stehen – Dexie braucht die Vorgeschichte für das Upgrade.
- Auf dem Pi bleiben die Zeilen der entfernten Arbeitsblätter bis zur
  Komplettlöschung liegen: ohne Tombstone lässt sich ein Löschvorgang nicht
  weiterreichen, und der Server kennt die Datenarten nur als Zeichenkette.
  Der Weg dahin ist `/clarity/debug`.

### Klarblick: Sync
- Ein Round-Trip, dasselbe Muster wie bei den Notizen: `POST /clarity/sync`
  schickt `since` plus alle `dirty`-Datensätze nach Tabelle gruppiert, bekommt
  `settled`, `changes` und `serverTime` zurück. Konflikte per last-write-wins
  über `updatedAt`; `since`/`serverUpdatedAt` sind Server-Zeit. Die beiden
  Uhren strikt trennen.
- **Der Server kennt keine inhaltlichen Spalten.** Der Inhalt steht als eine
  undurchsichtige Zeichenkette in `payload`, `kind` unterscheidet die Art. Was
  nicht in Spalten steht, kann nicht indiziert, durchsucht oder versehentlich
  geloggt werden – und ein neues Feld im Protokoll braucht keine Migration.
- **Der Server nimmt auch eine unbekannte Datenart an** und reicht sie
  unverändert zurück. Fastify räumt unbekannte Felder standardmäßig weg
  (`removeAdditional`) statt sie abzulehnen; ein Client, der dem Server voraus
  ist, käme dadurch in eine Endlosschleife (nie in `settled`, also für immer
  „ungesendet"). `RECORD_KINDS` ist Dokumentation, keine Schranke. Umgekehrt
  übergeht der Client Datenarten, die er nicht kennt – so kippen die alten
  Zeilen auf dem Pi nichts um.
- **Ein Tombstone trägt keinen Inhalt mehr** – anders als bei den Notizen.
  `deleteRecord()` verwirft die Felder sofort, `toWire()` schickt `{}`, und der
  Server leert zusätzlich selbst. Ein gelöschtes Protokoll, dessen Text noch
  monatelang in IndexedDB und in der SQLite-Datei liegt, ist genau das, was bei
  diesen Daten nicht passieren soll. Die Kehrseite: es gibt kein Zurückholen,
  deshalb fragt die Oberfläche vor jedem Löschen nach.
- **Regler lösen keinen Sync aus.** Geschrieben wird nach Dexie beim Loslassen
  (`onChangeEnd`), der Abgleich läuft in seinem eigenen Takt (60 s, plus Fokus
  und Reconnect). Der Rate-Limit-Reflex aus dem Smart-Home-Modul gilt hier
  sinngemäß, auch wenn das eigene Backend kein Limit hat.
- Kommt ein Datensatz mit unlesbarem Payload an, wird er **übersprungen**, nicht
  mit einer leeren Hülle eingesetzt – sonst überschriebe ein Übertragungsfehler
  den guten lokalen Stand. Dieselbe Überlegung wie beim Rückfall in
  `parseList()` im Notizen-Modul.
- `DELETE /clarity/all` löscht hart, ohne Tombstones – die einzige Stelle der
  Anwendung, die das tut. Erst der Server, dann das Gerät: andersherum holte
  der nächste Abgleich alles zurück. Andere Geräte behalten ihren Bestand, bis
  dort dasselbe ausgelöst wird.

### Klarblick: Datenschutz
- **Das sind Gesundheitsdaten.** Damit ändert sich die Bewertung des fehlenden
  App-Logins: wer im Tailnet die Adresse erreicht, sieht alles. Für Notizen war
  das vertretbar, hier ist es die offene Flanke. **Der App-Login samt
  HA-Token-Proxy ist deshalb das nächste Vorhaben; bis dahin gehören nur
  Testdaten hinein.** Ein PIN vor dem Modul ist kein Ersatz und wird nicht
  gebaut – er hülfe gegen einen kurzen Blick aufs entsperrte Handy und gegen
  sonst nichts.
- **Backup ist damit zwingend, und zwar `restic` mit Verschlüsselung, nicht
  `rsync`.** Ein unverschlüsseltes Backup dieser Tabelle auf einem zweiten
  Rechner verlagert das Problem nur.
- **Kein Feldinhalt in Logs.** `routes/clarity.js` hat einen eigenen
  Fehlerbehandler: der allgemeine in `app.js` reicht `error.message` einer
  Schema-Verletzung nach außen, was hier unerwünscht ist. Geloggt werden
  ausschließlich Anzahl, Zeitstempel und Fehlercode – nie das Fehlerobjekt.
- Keine Volltextindizes oder Suchtabellen serverseitig; gesucht wird lokal über
  Dexie. Kein `localStorage` für Inhalte. Nichts von diesem Modul im
  Web-Share-Target.

### Klarblick: Gedankenprotokoll
- **Sechs Schritte, jeder mit genau einer Frage** (`THOUGHT_STEPS` in
  `lib/thoughtRecord.js`): Situation · Gedanken · Gefühle · Denkfehler ·
  Antwort · Ergebnis. Das sind die Spalten des Arbeitsblattes in dessen
  Reihenfolge, eine Spalte je Bildschirm – eine Tabelle mit sechs Spalten ist
  auf einem Handy nicht zu bedienen.
  Auf dem Blatt sind Denkfehler, Antwort und der Glaube an die Antwort **eine**
  Spalte („Angemessene Reaktion darauf"); der Denkfehler bekommt hier einen
  eigenen Schritt, weil der Katalog zu lang ist, um über einem Textfeld zu
  stehen. Gleiche Reihenfolge, gleicher Inhalt, ein Schritt mehr.
- **Zwei Eingänge, absichtlich verschieden.** „Schnell festhalten"
  (`QuickCaptureModal`) fragt auf einem Bildschirm nach Situation, Gedanke und
  einem Gefühl – das ist der Fall, für den das Modul gebaut ist: in der Bahn,
  einhändig, kurz nachdem etwas passiert ist. „Neues Protokoll" öffnet den
  mehrstufigen Editor. Den unterwegs vorgesetzt zu bekommen hieße, dass am Ende
  gar nichts festgehalten wird.
- **Der Schritt steht in der URL** (`?schritt=3`), nicht im React-State. Damit
  geht die Zurück-Taste des Handys einen Schritt zurück statt aus dem halb
  geschriebenen Protokoll heraus – dieselbe Entscheidung wie bei der
  Dateivorschau.
- **Es gibt kein Speichern und kein Abbrechen.** `useRecordDraft` schreibt
  gesammelt nach Dexie: nach einer Tippause, bei jedem Schrittwechsel, beim
  Verlassen eines Feldes, beim Loslassen eines Reglers und bei
  `visibilitychange` – auf dem Handy ist das Wegwischen der häufigste Weg, eine
  Eingabe zu verlassen, und der einzige, bei dem React nichts mehr mitbekommt.
  Ein Schreibvorgang je Tastendruck wäre dagegen ein Datenstand pro halbem Satz
  und ein Sync-Anlass pro Sekunde.
- Der lokale Stand führt, solange der Editor offen ist. Käme jede Änderung aus
  der Datenbank zurück ins Feld, überschriebe der eigene gesicherte Stand die
  Zeichen, die währenddessen getippt wurden.
- **Leere Entwürfe räumt die Übersicht weg**, nicht der Editor: „Neues
  Protokoll" legt den Datensatz sofort an (der Editor braucht etwas zum
  Anhängen), und die Zurück-Taste läuft an jedem Aufräumen im Editor vorbei.
  Beim Betreten von `/clarity` landet sie zwangsläufig. Gleiches Muster wie bei
  `closeList()` in den Notizen.
- **Denkfehler werden nie automatisch erkannt.** `DistortionList` ist dieselbe
  Komponente für Nachschlagewerk (`/clarity/denkfehler`) und Auswahl im
  Protokoll; ohne `onToggle` fehlen schlicht die Haken. Kein eingegebener Text
  wird durchsucht, nichts vorgeschlagen. Ein Muster im eigenen Denken zu
  erkennen ist die Übung – eine App, die sie abnimmt, hat sie erledigt statt
  geübt. Auf dem Blatt steht die Spalte als „freiwillig"; das steht auch hier.
- **Die sechs Hilfsfragen** (`RESPONSE_QUESTIONS`) bekommen im Schritt
  „Antwort" **je ein eigenes Feld** und werden beantwortet, nicht nur
  angeboten. Als eingeklappte Anregung über einem einzigen Textfeld wurden
  zwei beantwortet und vier nie – sie sind aber die eigentliche Arbeit dieses
  Schrittes. Darunter steht weiterhin das Feld der Blattspalte („Und
  zusammengenommen?") samt Glaubenswert. Gespeichert wird unter der festen
  `id` der Frage (`responseAnswers`), nicht unter ihrem Index: eine Antwort
  soll ihrer Frage zugeordnet bleiben, auch wenn die Reihenfolge sich ändert.
  Keine Pflichtangabe, keine Zählung der beantworteten Fragen.
- **Textfelder setzen Aufzählungen fort** (`ListTextarea` +
  `lib/bulletList.js`): „- " am Zeilenanfang, Enter, und der Strich steht auf
  der nächsten Zeile; Enter auf einem leeren Punkt beendet die Liste. Der
  Inhalt bleibt reiner Text – kein zweiter TipTap-Editor, der HTML in die
  Datensätze und 430 KB ins Bundle brächte, damit Striche runder aussehen.
  Die Cursor-Logik liegt React-frei in `lib/`, weil sie sich beim Ausprobieren
  richtig anfühlt und bei eingerückten oder leeren Zeilen daneben liegt.
- `ScaleSlider` ist der einzige Regler des Moduls und hält vier Regeln fest:
  die Anzeige folgt dem Finger und geschrieben wird beim Loslassen; `null`
  heißt „nicht angegeben" (nicht 0, und deshalb steht ein unberührter Regler
  gedämpft in der Mitte, zeigt aber ab der ersten Berührung eine Zahl); die
  Enden sind mit 0 und 100 beziffert und nicht mit „gar nicht"/„völlig" –
  in der Sitzung wird über Zahlen gesprochen; und die Farbe hängt nie vom
  Wert ab.
- `BeforeAfter` zeigt im Schritt „Ergebnis" die beiden Werte nebeneinander –
  **ohne Differenz, ohne Pfeil, ohne Farbe.** Sobald daraus „−45" würde, hätte
  die App eine Richtung bewertet, in die es zu gehen hat, und eine Sitzung,
  nach der die Zahl gestiegen ist, sähe aus wie ein Misserfolg.
- **Die Punkte der Schrittleiste sind kein Fortschritt.** Gefüllt heißt „hier
  steht schon etwas" und hilft beim Wiederfinden. Es wird nichts gezählt,
  nichts in Prozent umgerechnet, nichts angemahnt. Ein Protokoll mit drei
  ausgefüllten Schritten ist vollständig für das, was in der Bahn ging.
- Ein Gedanke wird nur dort bearbeitet, wo er entsteht. In den späteren
  Schritten steht er als Zitat (`ThoughtsRecap`) – sonst stünde derselbe Text
  an drei Stellen zum Ändern und man wüsste nie, welche Fassung gilt.
- „Protokoll abschließen" ändert allein, in welcher Liste es steht. Kein Lob,
  keine Bestätigung, keine Auswertung – und es lässt sich wieder öffnen.
- Die Zeitangabe der Situation läuft über `<input type="datetime-local">`, nicht
  über ein Datums-Paket: das Feld liefert auf Android und iOS den systemeigenen
  Dialog. Umgerechnet wird von Hand (`toDateTimeInput`), niemals über
  `toISOString()` – das rechnet nach UTC um und verschöbe die Uhrzeit.
- `SyncStatus` liegt in `src/components`, weil zwei Module einen eigenen
  Abgleich haben. Geteilt ist ausschließlich die Anzeige; die Zustände
  (`useNotesSync`, `useClaritySync`) bleiben getrennt, damit ein Fehler im
  einen Modul den anderen nicht mitbetrifft.
- **Die Kachel in der Übersicht zeigt den Ertrag, nicht nur die Überschrift:**
  Gedanke mit Glaubenswert vorher und jetzt, Gefühle mit Stärken, gewählte
  Denkfehler, die Antwort, der Vorsatz. Ein Protokoll, dessen Ergebnis erst
  nach zwei Klicks sichtbar wird, blättert man nicht durch. Leere Teile fallen
  weg, statt als Lücke dazustehen. Deshalb auch nur zwei Spalten statt drei.
- Routen: `/clarity` (nur die beiden Kacheln), `/clarity/thoughts` (Liste),
  `/clarity/thoughts/:recordId` (Editor), `/clarity/denkfehler` (Katalog,
  angezeigt als „Systematische Denkfehler"), `/clarity/debug` (rohe Prüfseite
  auf der Datenschicht, nirgends verlinkt).

### Klarblick: Darstellung
- **Die Modulseite ist eine reine Auswahl.** Zwei Kacheln aus derselben
  `ModuleCard` wie die Startseite der App – wer die App kennt, weiß hier
  sofort, was zu tun ist. Kein Einleitungstext, kein Hinweiskasten, keine
  Zahlen: ein Text, der bei jedem Öffnen dasteht, wird nach dem zweiten Mal
  nicht mehr gelesen. Der Hinweis auf die fehlende Zugangskontrolle steht auf
  der Protokoll-Liste, also dort, wo Inhalte entstehen.
- **Die Modulfarbe ist Grün** (`CLARITY_COLOR` in `lib/appearance.js`, als
  Literal auch in `lib/modules.js`). Klarblick soll sich von den übrigen
  Modulen abheben und beim Öffnen weder nach Formular noch nach Krankenakte
  aussehen. **Die Farbe hängt nie von einem Wert ab** – ein Regler auf 90 ist
  genauso grün wie einer auf 10. Rot bleibt Fehlern und der Komplettlöschung
  vorbehalten.
- **Die Fußleiste des Editors klebt bündig am unteren Bildschirmrand.** Drei
  Dinge gehören dafür zusammen (siehe `.footer` in ThoughtRecord.module.scss):
  `bottom` zieht sie um die Innenabstände der AppShell nach unten, der
  Container darunter darf **kein** `pb` haben (ein sticky-Element kommt nie
  tiefer als der Inhaltsbereich seines Elternteils), und ein `z-index` legt sie
  über die Regler – deren Skalenbeschriftungen hängen absolut unter der
  Schiene und liefen sonst hindurch. `ScaleSlider` reserviert dafür zusätzlich
  Platz unter sich.
- Zwischen Beschriftung und Eingabefeld liegen 6 px, gesetzt in
  `styles/global.scss`. Mantine setzt dort gar nichts, wodurch jedes Formular
  eng wirkt. Der Selektor zählt die Eingabe-Komponenten einzeln auf: die
  Beschriftung einer Checkbox oder eines Chips heißt genauso, steht aber
  **neben** dem Bedienelement.
- Die Gefühls-Vorschläge stehen in **einer** fortlaufenden Reihe, nicht nach
  Gruppen getrennt. Gruppenweise umbrochen entstanden zwischen den Zeilen
  unterschiedlich große Lücken, die aussahen, als fehlte dort etwas. Die
  Gruppierung in `emotions.js` bestimmt nur noch die Reihenfolge.

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
