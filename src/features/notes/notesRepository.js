import { db } from './db.js';

/**
 * Datenzugriffsschicht für Notizen – die einzige Stelle, die Dexie direkt
 * anspricht. Komponenten nutzen die Hooks aus useNotes.js, der Sync die
 * Funktionen im unteren Teil dieser Datei.
 *
 * Jede lokale Änderung setzt `dirty = 1`. Das ist die Merkliste für den Sync:
 * ein Vergleich „updatedAt neuer als letzter Sync?" wäre falsch, weil
 * `updatedAt` von der Geräteuhr kommt und der Wasserstand vom Server.
 */

const LAST_SYNCED_KEY = 'notes:lastSyncedAt';

function newId() {
  // crypto.randomUUID gibt es nur in sicheren Kontexten (https/localhost).
  // Über Tailscale läuft die App mit HTTPS, der Fallback ist reine Vorsicht.
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `note-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
}

/** Aktive Notizen, zuletzt bearbeitete zuerst. Tombstones bleiben außen vor. */
export function listNotes() {
  return db.notes
    .orderBy('updatedAt')
    .reverse()
    .filter((note) => note.deletedAt == null)
    .toArray();
}

/** Eine einzelne Notiz oder undefined. */
export function getNote(id) {
  return db.notes.get(id);
}

/**
 * Legt eine Notiz an und gibt sie zurück.
 * @param {{ title?: string, body?: string }} input
 */
export async function createNote({ title = '', body = '' } = {}) {
  const now = Date.now();
  const note = {
    id: newId(),
    title: title.trim(),
    body,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    dirty: 1,
  };
  await db.notes.add(note);
  return note;
}

/**
 * Neuer `updatedAt`-Wert für eine Änderung – garantiert größer als der
 * bisherige Stand der Notiz.
 *
 * Normalerweise ist das schlicht Date.now(). Läuft aber die Uhr eines anderen
 * Geräts vor, kann eine hereinsynchronisierte Notiz in der Zukunft liegen.
 * Mit reinem Date.now() wäre die eigene Bearbeitung dann rechnerisch älter,
 * würde bei last-write-wins verlieren und beim nächsten Sync kommentarlos
 * wieder überschrieben. Wer gerade etwas ändert, hat den aktuellen Stand vor
 * sich – seine Änderung muss also gewinnen.
 */
function nextTimestamp(previous) {
  return Math.max(Date.now(), (previous ?? 0) + 1);
}

/**
 * Aktualisiert Titel und/oder Text. `updatedAt` wird immer mitgeschrieben.
 * @param {string} id
 * @param {{ title?: string, body?: string }} changes
 */
export async function updateNote(id, changes) {
  // modify() statt update(): der neue Zeitstempel hängt vom alten ab, das
  // muss innerhalb einer Transaktion passieren.
  const modified = await db.notes
    .where('id')
    .equals(id)
    .modify((note) => {
      note.updatedAt = nextTimestamp(note.updatedAt);
      note.dirty = 1;
      if (changes.title !== undefined) note.title = changes.title.trim();
      if (changes.body !== undefined) note.body = changes.body;
    });

  if (modified === 0) {
    throw new Error(`Notiz ${id} existiert nicht (mehr).`);
  }
}

/**
 * Löschen heißt: Tombstone setzen, nicht entfernen.
 *
 * Nur so erfahren andere Geräte überhaupt vom Löschen – eine verschwundene
 * Zeile ist von einer nie gesehenen nicht zu unterscheiden, das Gerät würde
 * die Notiz beim nächsten Sync wieder hochladen.
 *
 * `updatedAt` wandert mit, damit das Löschen bei last-write-wins gegen ältere
 * Bearbeitungen gewinnt.
 */
export async function deleteNote(id) {
  const modified = await db.notes
    .where('id')
    .equals(id)
    .modify((note) => {
      note.updatedAt = nextTimestamp(note.updatedAt);
      note.deletedAt = note.updatedAt;
      note.dirty = 1;
    });

  if (modified === 0) {
    throw new Error(`Notiz ${id} existiert nicht (mehr).`);
  }
}

// ---------------------------------------------------------------------------
// Sync
// ---------------------------------------------------------------------------

/** Zeitpunkt (Server-Uhr) des letzten erfolgreichen Syncs, 0 = noch nie. */
export async function getLastSyncedAt() {
  const row = await db.meta.get(LAST_SYNCED_KEY);
  return row?.value ?? 0;
}

/** Alle lokal geänderten Notizen, in der Form, die der Server erwartet. */
export async function listDirtyNotes() {
  const notes = await db.notes.where('dirty').equals(1).toArray();
  return notes.map(toWireNote);
}

/** `dirty` ist rein lokal – der Server lehnt unbekannte Felder ab. */
function toWireNote(note) {
  return {
    id: note.id,
    title: note.title ?? '',
    body: note.body ?? '',
    createdAt: note.createdAt,
    updatedAt: note.updatedAt,
    deletedAt: note.deletedAt ?? null,
  };
}

/**
 * Schreibt das Ergebnis eines Sync-Durchlaufs zurück – atomar, damit ein
 * Abbruch mittendrin keinen halben Stand hinterlässt.
 *
 * @param {object}   result
 * @param {object[]} result.pushed      was wir hochgeschickt haben
 * @param {string[]} result.settled     IDs, die der Server übernommen hat
 * @param {object[]} result.serverNotes Notizen, bei denen der Server neuer ist
 * @param {number}   result.serverTime  neuer Wasserstand
 * @returns {Promise<number>} Anzahl der lokal übernommenen Server-Notizen
 */
export async function commitSyncResult({ pushed, settled, serverNotes, serverTime }) {
  const accepted = new Set(settled);
  let applied = 0;

  await db.transaction('rw', db.notes, db.meta, async () => {
    for (const note of pushed) {
      // Nicht übernommen = der Server war neuer. Dann bleibt `dirty` stehen,
      // bis die Server-Version unten eingespielt ist.
      if (!accepted.has(note.id)) continue;

      const current = await db.notes.get(note.id);
      // Während des Requests kann weitergetippt worden sein – dann ist die
      // Notiz erneut geändert und muss geändert bleiben.
      if (current && current.updatedAt === note.updatedAt) {
        await db.notes.update(note.id, { dirty: 0 });
      }
    }

    for (const remote of serverNotes) {
      const local = await db.notes.get(remote.id);
      // Last-write-wins, auch hier: nur echte Neuerungen überschreiben.
      if (local && local.updatedAt >= remote.updatedAt) continue;

      await db.notes.put({ ...remote, deletedAt: remote.deletedAt ?? null, dirty: 0 });
      applied += 1;
    }

    await db.meta.put({ key: LAST_SYNCED_KEY, value: serverTime });
  });

  return applied;
}
