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

  // Favoriten. Nachträglich ergänzt, deshalb als ALTER – bestehende Zeilen
  // bekommen 0. `body` enthält seit dem Rich-Text-Editor HTML statt Klartext;
  // für die Datenbank bleibt es eine Zeichenkette, es braucht also keine
  // Migration der Inhalte (die macht der Client beim Dexie-Upgrade).
  addColumnIfMissing(db, 'notes', 'pinned', 'INTEGER NOT NULL DEFAULT 0');

  /**
   * Art der Notiz: 'text' (HTML aus dem Editor) oder 'list' (JSON mit den
   * Einträgen einer Checkliste). Für die Datenbank bleibt `body` in beiden
   * Fällen eine Zeichenkette – der Server interpretiert ihn nie.
   *
   * Der Standardwert 'text' ist entscheidend für den Übergang: Clients, die
   * die Spalte noch nicht kennen, schicken kein `kind` mit und ihre Notizen
   * landen trotzdem korrekt als Textdokumente.
   */
  addColumnIfMissing(db, 'notes', 'kind', "TEXT NOT NULL DEFAULT 'text'");

  /**
   * Bilder in Notizen.
   *
   * Nur die Metadaten stehen hier – die Bytes liegen als Datei unter
   * NOTE_IMAGES_ROOT. Das hält die Datenbank klein und erlaubt Streaming beim
   * Ausliefern. Im Notiz-HTML steht lediglich <img data-image-id="…">, der
   * Sync der Notizen bleibt dadurch schlank.
   */
  db.exec(`
    CREATE TABLE IF NOT EXISTS note_images (
      id              TEXT    PRIMARY KEY,
      noteId          TEXT    NOT NULL,
      mimeType        TEXT    NOT NULL,
      size            INTEGER NOT NULL,
      createdAt       INTEGER NOT NULL,
      serverUpdatedAt INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_note_images_note ON note_images (noteId);
  `);

  migratePause(db);
}

/**
 * Schema des Innehalten-Moduls.
 *
 * EINE Tabelle für alle sieben Datenarten, und der Inhalt steht undurchsichtig
 * in `payload`. Die Begründung steht ausführlich in pause/repository.js;
 * kurz: was der Server nicht in Spalten hat, kann er nicht indizieren, nicht
 * durchsuchen und nicht versehentlich in ein Log schreiben.
 *
 * `kind` unterscheidet die Datenarten ('thoughtRecords', 'experiments', …).
 * Die IDs sind clientseitige UUIDs und damit über alle Datenarten hinweg
 * eindeutig, deshalb genügt ein gemeinsamer Primärschlüssel.
 *
 * Die beiden Uhren sind dieselben wie bei den Notizen und dürfen genauso wenig
 * verwechselt werden: `updatedAt` kommt vom Client und entscheidet Konflikte,
 * `serverUpdatedAt` setzt der Server und ist die Grundlage für `since`.
 */
function migratePause(db) {
  /**
   * Das Modul hieß bis zum 05.08.2026 „Klarblick" und seine Tabelle
   * `clarity_records`. Umbenennen statt neu anlegen: die Zeilen sind dieselben,
   * und ein zweites Mal von vorn anzufangen hieße, dass die Geräte ihren
   * Bestand nicht mehr wiederfinden. Der alte Index verschwindet mit der
   * Tabelle nicht, weshalb er unten ohnehin unter neuem Namen entsteht.
   */
  const tables = db
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name IN (?, ?)")
    .all('clarity_records', 'pause_records')
    .map((row) => row.name);
  // Nur umbenennen, wenn das Ziel noch nicht da ist: ALTER TABLE bricht sonst
  // ab und der Server käme nicht mehr hoch.
  if (tables.includes('clarity_records') && !tables.includes('pause_records')) {
    db.exec(`
      DROP INDEX IF EXISTS idx_clarity_server_updated_at;
      ALTER TABLE clarity_records RENAME TO pause_records;
    `);
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS pause_records (
      id              TEXT    PRIMARY KEY,
      kind            TEXT    NOT NULL,
      payload         TEXT    NOT NULL DEFAULT '{}',
      createdAt       INTEGER NOT NULL,
      updatedAt       INTEGER NOT NULL,
      deletedAt       INTEGER,
      serverUpdatedAt INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_pause_server_updated_at
      ON pause_records (serverUpdatedAt);
  `);
}

/** SQLite kann kein "ADD COLUMN IF NOT EXISTS" – deshalb vorher nachsehen. */
function addColumnIfMissing(db, table, column, definition) {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all();
  if (columns.some((entry) => entry.name === column)) return;
  db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
}