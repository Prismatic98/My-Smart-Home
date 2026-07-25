import Dexie from 'dexie';

/**
 * Lokale Notizen-Datenbank (IndexedDB via Dexie).
 *
 * Local-first: die App schreibt ausschließlich hierhin und funktioniert
 * damit sofort offline. Eine spätere Backend-Synchronisation setzt darauf auf,
 * deshalb:
 *  - `id` ist eine UUID (kein Auto-Increment), damit IDs auch über mehrere
 *    Geräte hinweg kollisionsfrei sind.
 *  - `createdAt`/`updatedAt` sind Millisekunden-Timestamps (Number), damit sie
 *    indizierbar und für Konfliktauflösung vergleichbar sind.
 *
 * Tabelle `notes`: { id, title, body, createdAt, updatedAt }
 * Indiziert werden id (Primary Key), updatedAt und createdAt.
 */
export const db = new Dexie('smart-home-notes');

db.version(1).stores({
  notes: 'id, updatedAt, createdAt',
});

export const notesTable = db.notes;