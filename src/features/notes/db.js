import Dexie from 'dexie';

/**
 * Lokale Notizen-Datenbank (IndexedDB via Dexie).
 *
 * Local-first: die App schreibt ausschließlich hierhin und funktioniert damit
 * sofort offline. Der Backend-Sync (notesSync.js) läuft nebenher und ist für
 * die UI unsichtbar.
 *
 * Tabelle `notes`: { id, title, body, createdAt, updatedAt, deletedAt, dirty }
 *  - `id`         UUID vom Client (crypto.randomUUID), damit IDs über mehrere
 *                 Geräte hinweg kollisionsfrei sind.
 *  - `createdAt`  Millisekunden-Timestamps (Number), indizierbar und
 *    `updatedAt`  vergleichbar. `updatedAt` entscheidet Sync-Konflikte.
 *  - `deletedAt`  null = aktiv, sonst Zeitpunkt des Löschens (Tombstone).
 *  - `dirty`      1 = lokal geändert, noch nicht beim Server angekommen.
 *
 * Tabelle `meta`: { key, value } – hält den Wasserstand des letzten Syncs.
 */
export const db = new Dexie('smart-home-notes');

db.version(1).stores({
  notes: 'id, updatedAt, createdAt',
});

/**
 * Version 2 rüstet den Sync nach.
 *
 * `deletedAt` bekommt bewusst KEINEN Index: IndexedDB indiziert keine
 * null-Werte, der Index enthielte also ausgerechnet die aktiven Notizen
 * nicht. Gefiltert wird stattdessen in JS – bei dieser Datenmenge egal.
 *
 * `dirty` wird als 0/1 gespeichert statt als Boolean, weil IndexedDB
 * Booleans nicht indizieren kann.
 */
db.version(2)
  .stores({
    notes: 'id, updatedAt, createdAt, dirty',
    meta: 'key',
  })
  .upgrade((tx) =>
    tx
      .table('notes')
      .toCollection()
      .modify((note) => {
        note.deletedAt = null;
        // Bestehende Notizen kennt der Server noch nicht. Als geändert
        // markieren, damit der erste Sync sie hochlädt und nichts verloren geht.
        note.dirty = 1;
      })
  );
