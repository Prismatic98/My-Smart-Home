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

## Stand der Geräte-Integration
- Govee-Lampen: über "Govee Lights Local" (lokal) eingebunden, benannt, steuerbar.
- Govee-Szenen/Pixel Light: offen, später über Govee-Cloud (HACS + API-Key).
- SmartThings/Samsung-Waschmaschine: zurückgestellt.
- Narwal Freo X Ultra (Saugroboter): keine saubere HA-Anbindung, zurückgestellt.

## Konventionen
- Kommunikation und Erklärungen auf Deutsch.
- Infrastruktur-Konfig (docker-compose.yml etc.) wird mit ins Repo versioniert.
- Frontend in JavaScript (JSX), kein TypeScript.

## Betriebshinweise (nicht anfassen)
- Kernel-Parameter `nvme_core.default_ps_max_latency_us=0` in /boot/firmware/cmdline.txt
  MUSS aktiv bleiben — verhindert NVMe-I/O-Fehler (APST). Nicht entfernen.
- Pi immer sauber herunterfahren (`sudo poweroff` oder kurzer Power-Knopf-Druck).

## Aktueller Stand
Infrastruktur steht (Pi, Docker, Home Assistant, Tailscale, Govee-Lampen).
Nächster Schritt: Grundgerüst der PWA (Vite + PWA-Plugin) und erstes Backend-Modul (Notizen).