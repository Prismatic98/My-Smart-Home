import Dexie from 'dexie';

import { textToHtml } from './lib/noteHtml.js';

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

/**
 * Version 3 bringt Rich Text, Favoriten und Bilder.
 *
 * `body` enthält ab hier HTML statt Klartext. Bestehende Notizen werden beim
 * Upgrade umgewandelt und mit neuem `updatedAt` als geändert markiert – damit
 * gewinnt die umgewandelte Fassung beim Abgleich und wandert auf die anderen
 * Geräte. Der Alternativweg (ein Feld `bodyFormat` im Sync-Protokoll) hätte
 * dauerhaft Komplexität für eine einmalige Umstellung bedeutet.
 *
 * `pinned` wird als 0/1 gespeichert, nicht als Boolean – IndexedDB kann
 * Booleans nicht indizieren.
 *
 * Tabelle `noteImages`: { id, noteId, blob, mimeType, size, createdAt,
 * dirty, deletedAt }. Die Bilder liegen als Blob lokal; im Notiz-HTML steht
 * nur <img data-image-id="…">. Dadurch bleibt der Notiz-Sync klein, und ein
 * eingefügtes Bild ist auch offline sofort da.
 */
db.version(3)
  .stores({
    notes: 'id, updatedAt, createdAt, dirty, pinned',
    noteImages: 'id, noteId, dirty',
    meta: 'key',
  })
  .upgrade((tx) =>
    tx
      .table('notes')
      .toCollection()
      .modify((note) => {
        note.pinned = 0;
        note.body = textToHtml(note.body ?? '');
        note.updatedAt = Math.max(Date.now(), (note.updatedAt ?? 0) + 1);
        note.dirty = 1;
      })
  );
