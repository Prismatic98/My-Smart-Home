import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

import Database from 'better-sqlite3';

/**
 * Öffnet die SQLite-Datei und legt das Schema an (idempotent).
 *
 * Der Pfad kommt über DB_PATH von außen, damit die Datei auf dem Pi in einem
 * gemounteten Verzeichnis liegt und Container-Neustarts übersteht.
 */
export function openDatabase(dbPath) {
  // Beim ersten Start existiert das Zielverzeichnis im Container noch nicht.
  mkdirSync(dirname(dbPath), { recursive: true });

  const db = new Database(dbPath);

  // WAL: Leser blockieren den Schreiber nicht mehr. Wichtig zu wissen fürs
  // Deployment – WAL legt <datei>-wal und <datei>-shm NEBEN die Datenbank.
  // Deshalb muss im Container das Verzeichnis gemountet werden, nicht die
  // einzelne Datei (ein Datei-Mount würde die Sidecar-Dateien abschneiden).
  db.pragma('journal_mode = WAL');
  // Mit WAL ist NORMAL der übliche Kompromiss: kein fsync pro Commit, aber
  // crash-sicher bis auf die letzten Transaktionen bei Stromausfall.
  db.pragma('synchronous = NORMAL');
  // Statt sofort mit SQLITE_BUSY zu scheitern, kurz auf die Sperre warten.
  db.pragma('busy_timeout = 5000');

  migrate(db);

  return db;
}

/**
 * Schema der Notizen.
 *
 * Zwei Zeitstempel, die nicht verwechselt werden dürfen:
 *
 *  - `updatedAt`        kommt vom Client und entscheidet Konflikte
 *                       (last write wins).
 *  - `serverUpdatedAt`  setzt der Server bei jedem Schreibvorgang selbst und
 *                       ist die Grundlage für `since`. So vergleicht der
 *                       Client seinen Wasserstand ausschließlich mit Werten
 *                       aus EINER Uhr. Würde `since` auf `updatedAt` filtern,
 *                       könnte die schief laufende Uhr eines Geräts dafür
 *                       sorgen, dass Änderungen nie ausgeliefert werden.
 *
 * `deletedAt` ist ein Tombstone: gelöschte Notizen bleiben als Zeile stehen,
 * damit andere Geräte das Löschen überhaupt mitbekommen können.
 */
function migrate(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS notes (
      id              TEXT    PRIMARY KEY,
      title           TEXT    NOT NULL DEFAULT '',
      body            TEXT    NOT NULL DEFAULT '',
      createdAt       INTEGER NOT NULL,
      updatedAt       INTEGER NOT NULL,
      deletedAt       INTEGER,
      serverUpdatedAt INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_notes_server_updated_at
      ON notes (serverUpdatedAt);
  `);
}