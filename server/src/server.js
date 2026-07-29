import { buildApp } from './app.js';
import { openDatabase } from './db.js';
import { ensureFilesRoot, FILES_ROOT } from './files/paths.js';

/**
 * Einstiegspunkt. Konfiguration ausschließlich über Env-Variablen:
 *
 *   DB_PATH     Pfad zur SQLite-Datei. Auf dem Pi zeigt der in ein gemountetes
 *               Verzeichnis, damit die Daten Container-Neustarts überleben.
 *   FILES_ROOT  Wurzelverzeichnis der Dateiablage, ebenfalls gemountet.
 *   PORT        Port, auf dem Fastify lauscht.
 *   HOST        Standard 127.0.0.1 – der Server ist nur über den Reverse-Proxy
 *               erreichbar, nicht direkt aus dem LAN. Im Container läuft er mit
 *               network_mode: host, das Loopback ist also das des Pi.
 */
const DB_PATH = process.env.DB_PATH ?? './data/notes.db';
const PORT = Number(process.env.PORT ?? 3001);
const HOST = process.env.HOST ?? '127.0.0.1';

const db = openDatabase(DB_PATH);
const app = buildApp({ db });

app.log.info({ dbPath: DB_PATH }, 'SQLite geöffnet');

// Lieber hier laut scheitern als beim ersten Upload: fehlende Schreibrechte
// auf dem gemounteten Verzeichnis sind der häufigste Stolperstein.
try {
  await ensureFilesRoot();
  app.log.info({ filesRoot: FILES_ROOT }, 'Dateiablage bereit');
} catch (cause) {
  app.log.error(cause.message);
  process.exit(1);
}

// Sauber zumachen, damit SQLite den WAL-Inhalt in die Datenbank zurückschreibt.
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.once(signal, async () => {
    app.log.info(`${signal} empfangen, fahre herunter`);
    try {
      await app.close();
      db.close();
      process.exit(0);
    } catch (cause) {
      app.log.error({ err: cause }, 'Fehler beim Herunterfahren');
      process.exit(1);
    }
  });
}

try {
  await app.listen({ port: PORT, host: HOST });
} catch (cause) {
  app.log.error({ err: cause }, 'Start fehlgeschlagen');
  process.exit(1);
}
