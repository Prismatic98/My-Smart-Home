# Zwei Stufen: erst die PWA bauen (node), dann nur das Ergebnis ausliefern (caddy).
# Im Endbild landen weder node_modules noch Quellcode – nur dist/ und die Caddyfile.

# ---------------------------------------------------------------------------
# 1) Build
# ---------------------------------------------------------------------------
FROM node:22-bookworm-slim AS build

WORKDIR /app

# Erst nur die Manifeste kopieren: solange sich die nicht ändern, kommt
# npm ci aus dem Docker-Layer-Cache (auf dem Pi der langsamste Schritt).
COPY package.json package-lock.json ./
RUN npm ci

# Vite backt VITE_*-Variablen zur Build-Zeit fest ins Bundle ein – sie müssen
# also hier gesetzt sein, nicht erst beim Start des Containers.
# Werte kommen über docker-compose.prod.yml aus .env.prod.
#
# Bewusst NACH npm ci: ein geänderter Token würde sonst den Cache aller
# folgenden Layer verwerfen und jedes Mal ein volles npm ci auslösen.
ARG VITE_HA_URL=""
ARG VITE_HA_TOKEN=""
ENV VITE_HA_URL=$VITE_HA_URL
ENV VITE_HA_TOKEN=$VITE_HA_TOKEN

# Ohne Token baut die App zwar durch, kann aber nichts steuern – lieber hier
# laut scheitern als später still im Browser. Häufigste Ursache: --env-file
# beim docker-compose-Aufruf vergessen.
RUN test -n "$VITE_HA_TOKEN" || { \
      echo "FEHLER: VITE_HA_TOKEN ist leer."; \
      echo "  .env.prod anlegen (Vorlage: .env.prod.example) und bauen mit:"; \
      echo "  docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build"; \
      exit 1; \
    }

COPY . .
RUN npm run build

# ---------------------------------------------------------------------------
# 2) Serve
# ---------------------------------------------------------------------------
FROM caddy:latest

COPY Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/dist /srv

# Nur http auf 8080 – TLS macht Tailscale davor.
EXPOSE 8080

# Der CMD des caddy-Images startet bereits /etc/caddy/Caddyfile.