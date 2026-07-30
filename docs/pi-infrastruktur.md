# Pi-Infrastruktur — Ist-Zustand

Bestandsaufnahme des Raspberry Pi, auf dem diese App und Home Assistant laufen.
Erhoben am **30.07.2026** per SSH, rein lesend.

Diese Datei beschreibt die **Infrastruktur**, nicht die Inhalte: was an Notizen
oder Dateien in der Ablage liegt, steht hier absichtlich nicht.

Was hier steht, ist ein Messwert, keine Sollvorgabe. Wenn Realität und Datei
auseinandergehen, hat die Realität recht — dann diese Datei nachziehen.

---

## Hardware

| | |
|---|---|
| Modell | Raspberry Pi 5 Model B Rev 1.1 |
| RAM | 8 GB (7,9 GiB nutzbar) |
| Datenträger | NVMe `CT500P310SSD8` (Crucial P310, 500 GB) |
| Partitionen | `nvme0n1p1` 512 MB vfat → `/boot/firmware`, `nvme0n1p2` 465 GB ext4 → `/` |
| Belegung `/` | 12 GB von 459 GB (3 %) |
| Swap | 2 GB **zram** (komprimiert im RAM, keine Swap-Datei auf der SSD) |
| CPU-Temperatur | 48 °C im Leerlauf, `get_throttled=0x0` (nie gedrosselt) |

Kein Bind-Mount, kein RAID, keine externe Platte — alles liegt auf der einen NVMe.

## Betriebssystem

| | |
|---|---|
| OS | Debian GNU/Linux 13 (trixie), 13.6 — Raspberry Pi OS Lite 64-bit |
| Kernel | `6.18.34+rpt-rpi-2712` |
| Architektur | arm64 / aarch64 |
| Hostname | `smarthome` |
| User | `dennis` |
| journald | **persistent** (`/var/log/journal` existiert) — Logs überleben den Reboot |

### Kernel-Parameter in `/boot/firmware/cmdline.txt`

```
console=serial0,115200 console=tty1 root=PARTUUID=ee99a5f8-02 rootfstype=ext4
fsck.repair=yes rootwait nvme_core.default_ps_max_latency_us=0
pcie_aspm=off pcie_port_pm=off
```

**Drei Parameter gehören zur NVMe-Baustelle und müssen alle bleiben:**

- `nvme_core.default_ps_max_latency_us=0` — schaltet APST ab
- `pcie_aspm=off` — PCIe Active State Power Management aus
- `pcie_port_pm=off` — Port-Power-Management aus

Alle drei zielen auf dasselbe Problem: Stromsparzustände von NVMe und PCIe
führen auf dem Pi 5 zu I/O-Fehlern. In CLAUDE.md war lange nur der erste
Parameter als schützenswert vermerkt — wer die anderen zwei für Kosmetik hält
und entfernt, holt sich das Problem halb zurück.

## Netzwerk

| Interface | Adresse | Status |
|---|---|---|
| `eth0` | 192.168.178.52 | UP |
| `wlan0` | 192.168.178.51 | UP |
| `tailscale0` | 100.68.240.13 / `fd7a:115c:a1e0::ef01:f030` | UP |

**Beide LAN-Interfaces sind gleichzeitig aktiv** und haben je eine eigene IP von
der Fritzbox. Deshalb löst `smarthome.fritz.box` auf **zwei** IPv4-Adressen auf,
und welche ein Client nimmt, ist nicht vorhersagbar. Für den Betrieb harmlos
(beide führen zum selben Host), aber eine Fehlersuche kann daran hängenbleiben —
etwa wenn eine Firewall-Regel oder ein DHCP-Lease nur eine der beiden kennt.
Wer das eindeutig haben will, deaktiviert WLAN oder gibt dem Pi feste Leases.

### Namensauflösung

- **Im Tailnet:** MagicDNS-Name `smarthome` → 100.68.240.13
- **Im Heimnetz:** `smarthome.fritz.box` über die Fritzbox → 192.168.178.51/.52

Beide Wege heißen `smarthome`. Ein `ssh dennis@smarthome` aus dem Heimnetz geht
also über das **LAN** und den normalen `sshd`, nicht über Tailscale SSH — auch
wenn Tailscale läuft. Das ist relevant für die Authentifizierung (siehe unten).

### Lauschende Ports

| Adresse:Port | Dienst | Reichweite |
|---|---|---|
| `0.0.0.0:22` | OpenSSH | **ganzes LAN** + Tailnet |
| `0.0.0.0:8123` | Home Assistant | **ganzes LAN** + Tailnet |
| `*:8080` | Caddy (die PWA) | ganzes LAN + Tailnet |
| `127.0.0.1:3001` | Fastify-Backend | nur lokal ✔ |
| `127.0.0.1:18554` | go2rtc (RTSP) | nur lokal ✔ |
| `*:18555` | go2rtc (WebRTC) | ganzes LAN |
| `100.68.240.13:443` | Tailscale `serve` (HTTPS) | nur Tailnet ✔ |

**Home Assistant hängt auf `0.0.0.0:8123`, also offen im Heimnetz** — nicht nur
über Tailscale. Wer im WLAN ist, erreicht die HA-Anmeldung direkt. Das ist der
HA-Standard und durch das Login abgesichert, widerspricht aber der Annahme „die
App ist nur privat über Tailscale erreichbar", auf der die Entscheidung beruht,
den Long-Lived Token ins Client-Bundle zu backen. Der Token ist damit für jeden
im Heimnetz auslesbar, der `http://smarthome:8080` aufruft. Für ein
Einfamilienhaus-LAN vertretbar; beim geplanten Umzug des Tokens auf die
Serverseite verschwindet der Punkt von selbst.

Caddy auf `:8080` ist ebenfalls LAN-offen und hat **kein** eigenes Login — die
PWA selbst ist ungeschützt erreichbar.

### Tailscale

| | |
|---|---|
| Version | 1.98.9 |
| Tailnet | `tailad0e4d.ts.net` |
| Konto | `dennissterle6@` |
| Geräte | `smarthome` (linux), `pixel-8` (android) |
| Tailscale SSH | **aktiv** (`RunSSH: true`) |
| Exit-Node | nicht gesetzt |
| Advertised Routes | keine |
| ShieldsUp | false |

`tailscale serve`:

```
https://smarthome.tailad0e4d.ts.net (tailnet only)
`-- / proxy http://127.0.0.1:8080
```

Nur die **App** liegt hinter dem Tailscale-HTTPS. Home Assistant ist dort nicht
eigenständig veröffentlicht — der Zugriff darauf läuft über den Caddy-Proxy
unter `/api/*`. TLS macht komplett Tailscale, Caddy hat `auto_https off`.

### SSH-Zugang

`sshd` erlaubt Publickey und Passwort. In `~/.ssh/authorized_keys` liegt ein
ed25519-Key für den automatisierten Zugriff von Claude Code
(`claude-code@Razer-Sterle`, eingetragen 30.07.2026), weil auf dem Windows-Rechner
kein Tailscale installiert ist und der LAN-Weg deshalb einen Key braucht.

Zwei Konsequenzen für automatisierte Zugriffe:

- `sudo` funktioniert über diesen Weg **nicht** — es gibt kein TTY, der
  Passwort-Prompt bricht still ab. Ein `sudo find … 2>/dev/null` liefert dann
  eine leere Ausgabe, die wie „nichts gefunden" aussieht. Befehle ohne sudo
  formulieren.
- Von außerhalb des Heimnetzes greift der Weg nicht.

## Docker

| | |
|---|---|
| Docker | 29.6.2 (build dfc4efb) |
| Compose | v5.3.1 (Plugin) |
| `/etc/docker/daemon.json` | **nicht vorhanden** — reine Defaults |
| Autostart | `docker.service` enabled ✔ |
| Volumes | **keine** — ausschließlich Bind-Mounts |

Kein `daemon.json` heißt: keine globale Log-Rotation für Container. Die beiden
App-Container regeln das selbst über `logging: max-size 10m / max-file 3` in
ihrer Compose-Datei — **der HA-Container nicht**. Dessen json-Log wächst
unbegrenzt. HA rotiert zwar seine eigene `home-assistant.log` im
Config-Verzeichnis, das ist aber eine andere Datei als das Docker-Log.

### Container

| Name | Image | Netz | Restart | Compose-Datei |
|---|---|---|---|---|
| `homeassistant` | `ghcr.io/home-assistant/home-assistant:stable` | host | `unless-stopped` | `~/docker/docker-compose.yml` |
| `my-smart-home` | `my-smart-home:latest` (lokal gebaut) | host | `unless-stopped` | `~/docker/my-smart-home/docker-compose.prod.yml` |
| `my-smart-home-backend` | `my-smart-home-backend:latest` (lokal gebaut) | host | `unless-stopped` | dieselbe |
| `elastic_yalow` | `hello-world` | bridge | `no` | — (Testleiche, Exited seit 22.07.) |

Alle drei produktiven Container laufen mit `network_mode: host` und teilen sich
das Loopback des Pi — das ist die Grundlage dafür, dass Caddy HA unter
`127.0.0.1:8123` und das Backend unter `127.0.0.1:3001` findet, ohne
Port-Mapping.

### Bind-Mounts

```
homeassistant
  /home/dennis/docker/homeassistant       -> /config        (rw)
  /etc/localtime                          -> /etc/localtime (ro)

my-smart-home
  (keine)

my-smart-home-backend
  /home/dennis/docker/my-smart-home/data       -> /data       (rw)
  /home/dennis/docker/my-smart-home/data/files -> /data/files (rw)
```

### Images und Plattenverbrauch

| | |
|---|---|
| Images | 4, zusammen 3,9 GB (HA allein 3,38 GB) |
| Container-Layer | 52 MB |
| **Build-Cache** | **4,27 GB, davon 3,83 GB freigebbar** |

`docker builder prune` gibt knapp 4 GB frei. Bei 428 GB frei kein Druck, aber es
wächst mit jedem `--build`.

## Verzeichnisse auf dem Pi

```
/home/dennis/
├── docker/
│   ├── docker-compose.yml          <-- Home Assistant (nur dieser eine Service)
│   ├── homeassistant/              <-- HA-Config, = /config im Container
│   └── my-smart-home/              <-- Git-Klon des Repos, hier wird gebaut
│       ├── docker-compose.prod.yml     App + Backend
│       ├── Caddyfile
│       ├── Dockerfile
│       ├── .env.prod                   (gitignored, enthält den HA-Token)
│       └── data/                       Backend-Daten (SQLite, Dateiablage)
└── ha-backup-2026-07-30-1933.tar.gz    manuelles HA-Backup
```

**Die Suche nach der Compose-Datei ist damit beendet:** Home Assistant wird von
`/home/dennis/docker/docker-compose.yml` gestartet, App und Backend von
`/home/dennis/docker/my-smart-home/docker-compose.prod.yml`. Systemweit gibt es
keine weiteren Compose-Dateien.

Das Repo auf dem Pi ist ein Klon von
`https://github.com/Prismatic98/My-Smart-Home.git`, Branch `main`. Der Build
passiert direkt dort (`docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build`),
es gibt keine Registry und keine CI.

## Home Assistant

| | |
|---|---|
| Version | 2026.7.3 |
| Config | `/home/dennis/docker/homeassistant` (direkt, **kein** Unterordner `config`) |
| Recorder-DB | `home-assistant_v2.db`, SQLite im WAL-Modus |
| User im Container | `root` (uid 0) |
| Areas | Wohnzimmer, Küche, Schlafzimmer, Flur, Badezimmer |

`configuration.yaml` ist bewusst schlank: `default_config`, Themes, die
`!include`s für Automationen/Skripte/Szenen und der `http`-Block mit
`use_x_forwarded_for` + `trusted_proxies: 127.0.0.1, ::1` — Letzteres ist nötig,
weil HA hinter dem Caddy-Proxy sitzt und sonst die echten Client-IPs nicht
akzeptiert.

### Konfigurierte Integrationen

`analytics`, `backup`, `bluetooth`, `go2rtc`, `google_translate`, `govee`,
`hacs`, `met`, `radio_browser`, `shopping_list`, `sun` — je eine Config-Entry.
Der Großteil kommt automatisch über `default_config`; selbst eingerichtet sind
`govee` (Govee Lights Local) und `hacs`.

### HACS

Installiert am 30.07.2026 nach `custom_components/hacs/`, Version **2.0.5**
(Release-Dateien vom 28.01.2025). Die Dateien gehören `dennis:dennis`; weil der
Container als root läuft, darf er trotzdem lesen und schreiben — Letzteres
braucht HACS, um eigene Integrationen abzulegen.

Beim Start protokolliert HA `We found a custom integration hacs which has not
been tested by Home Assistant`. Das ist die Standardmeldung für jede
Custom-Integration und kein Fehler.

### Bekannter Dauerfehler: Bluetooth

Alle paar Sekunden, seit mindestens dem 30.07.2026 und über Neustarts hinweg:

```
ERROR [habluetooth.scanner] hci0 (88:A2:9E:ED:8C:AC): Failed to force stop scanner
AttributeError: 'NoneType' object has no attribute 'send'
  in bleak_retry_connector/bluez.py stop_discovery
```

Der Bluetooth-Adapter (`hci0`, UART, on-board) ist UP RUNNING. Der Fehler ist
harmlos für die Datenhaltung, aber er ist praktisch der **einzige** Inhalt des
Fehler-Logs und macht es dadurch unbrauchbar: echte Fehler gehen darin unter.
Ungelöst, eigenes Thema. Wer die Logs auswertet, filtert mit `grep -v habluetooth`.

### Neustart: `stop` statt `down`

`docker compose down` hat am 30.07.2026 dazu geführt, dass der Recorder beim
nächsten Start meldete:

```
WARNING [recorder.util] The system could not validate that the sqlite3
database at //config/home-assistant_v2.db was shutdown cleanly
```

Die DB war unbeschädigt (`PRAGMA quick_check` = `ok`), aber die Warnung ist
vermeidbar. Sauberer Weg:

```bash
cd /home/dennis/docker
docker compose stop -t 60 homeassistant   # HA braucht real ~8 s
docker compose start homeassistant
```

Beim Prüfen der Logs danach `--since` benutzen:

```bash
docker logs homeassistant --since "$(docker inspect homeassistant --format '{{.State.StartedAt}}')"
```

Ohne `--since` wirft `docker logs` alle Läufe desselben Containers zusammen, und
alte Warnungen sehen aus wie neue.

## Caddy

Läuft **im** App-Container, Config unter `~/docker/my-smart-home/Caddyfile`
(auch im Repo). Lauscht auf `:8080`, `admin off`, `auto_https off` (TLS macht
Tailscale). Drei Routen:

| Pfad | Ziel |
|---|---|
| `/api/*` | `127.0.0.1:8123` (Home Assistant, inkl. WebSocket unter `/api/websocket`) |
| `/backend/*` | `127.0.0.1:3001`, Präfix abgeschnitten, `max_size 5GB`, Timeouts 0 |
| alles andere | statisches `/srv` mit SPA-Fallback auf `index.html` |

Cache-Header: `/assets/*` ein Jahr immutable, App-Shell und Service Worker
`no-cache`.

## Dienste und Zeitpläne

Laufende Dienste (ohne System-Rauschen): `docker`, `containerd`, `tailscaled`,
`ssh`, `bluetooth`, `NetworkManager`, `cron`, `dbus`.

`docker` und `tailscaled` sind **enabled**, kommen also nach einem Reboot von
selbst hoch. Zusammen mit `restart: unless-stopped` heißt das: nach einem
Stromausfall läuft der Stack ohne Handgriff wieder.

Aktive Timer sind ausschließlich Debian-Standard: `apt-daily`,
`apt-daily-upgrade`, `logrotate`, `dpkg-db-backup`, `man-db`,
`systemd-tmpfiles-clean`, `rpi-zram-writeback`, `e2scrub_all`, `fstrim`.

Kein Crontab für `dennis`.

## Lücken, die wir bewusst kennen

Nichts davon ist kaputt — es ist der Unterschied zwischen „läuft" und
„abgesichert":

- **Kein automatisiertes Backup.** Es gibt genau ein manuelles Archiv
  (`~/ha-backup-2026-07-30-1933.tar.gz`). Weder die HA-Config noch die
  Notizen-DB noch die Dateiablage werden regelmäßig gesichert, und nichts davon
  liegt außerhalb des Pi. Ein Ausfall der einen NVMe kostet alles. Die
  HA-Integration `backup` ist eingerichtet, aber ohne Ziel außerhalb des Geräts
  hilft sie nur gegen Konfigurationsfehler, nicht gegen Hardware-Ausfall.
- **`unattended-upgrades` ist nicht installiert**, `20auto-upgrades` existiert
  nicht. Die `apt-daily`-Timer laufen, aber sie aktualisieren nichts von selbst —
  Sicherheitsupdates für Debian müssen von Hand kommen.
- **Kein Docker-Log-Limit für den HA-Container** (siehe oben).
- **`hello-world`-Container** `elastic_yalow` von einem Test am 22.07. liegt noch
  herum. Kostet nichts, `docker rm elastic_yalow` räumt auf.
- **3,83 GB freigebbarer Build-Cache.**
- **Bluetooth-Fehlerflut** verdeckt echte HA-Fehler.
- **HA offen im LAN** auf Port 8123, App ohne Login auf 8080 (siehe „Lauschende
  Ports").

## Nützliche Befehle

```bash
# Home Assistant neu starten (sauber)
cd /home/dennis/docker && docker compose stop -t 60 homeassistant && docker compose start homeassistant

# HA-Logs des aktuellen Laufs, ohne die Bluetooth-Flut
docker logs homeassistant --since "$(docker inspect homeassistant --format '{{.State.StartedAt}}')" 2>&1 | grep -v habluetooth

# DB-Integrität prüfen
docker exec homeassistant python -c "import sqlite3;print(sqlite3.connect('/config/home-assistant_v2.db').execute('PRAGMA quick_check').fetchone())"

# App + Backend neu bauen und starten
cd /home/dennis/docker/my-smart-home && git pull && \
  docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build

# Plattenplatz zurückholen
docker builder prune
```
