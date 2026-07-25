# Kein Build-Schritt nötig: better-sqlite3 bringt für linux-arm64 ein fertiges
# N-API-Binary im npm-Paket mit. Deshalb --ignore-scripts – sonst würde npm
# wegen der binding.gyp einen Quellbau starten und Python + g++ verlangen
# (siehe .npmrc).

FROM node:22-bookworm-slim

ENV NODE_ENV=production

# Ablage der SQLite-Datei. Der Pfad zeigt in ein per Bind-Mount eingehängtes
# Verzeichnis – als Verzeichnis, nicht als einzelne Datei, weil WAL die
# Sidecars -wal und -shm daneben legt.
ENV DB_PATH=/data/notes.db
ENV PORT=3001
# Im Container-Netz ist 0.0.0.0 richtig. Läuft der Container mit
# network_mode: host (so wie in docker-compose.prod.yml), wird HOST dort auf
# 127.0.0.1 gesetzt – sonst hinge der Server offen im LAN.
ENV HOST=0.0.0.0

WORKDIR /app

# Erst die Manifeste: solange die sich nicht ändern, kommt npm ci aus dem Cache.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts

COPY src ./src

# Nicht als root laufen. Das node-Image bringt den User `node` (uid 1000) mit.
# Beim Bind-Mount gilt die Ownership des Host-Verzeichnisses: das muss uid 1000
# gehören, sonst kann der Server die Datenbank nicht anlegen (siehe README).
RUN mkdir -p /data && chown -R node:node /data
USER node

EXPOSE 3001

CMD ["node", "src/server.js"]
