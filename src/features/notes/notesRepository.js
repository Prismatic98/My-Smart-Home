import { db } from './db.js';
import { extractImageIds } from './lib/noteHtml.js';

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

/**
 * Aktive Notizen: Favoriten zuerst, darin die zuletzt bearbeiteten oben.
 *
 * Die Sortierung nach `updatedAt` macht der Index, die Favoriten kommen per
 * stabilem sort() davor – dadurch bleibt die Reihenfolge innerhalb der beiden
 * Gruppen erhalten, ohne zweimal zu sortieren.
 */
export function listNotes() {
  return db.notes
    .orderBy('updatedAt')
    .reverse()
    .filter((note) => note.deletedAt == null)
    .toArray()
    .then((notes) => notes.sort((a, b) => (b.pinned ?? 0) - (a.pinned ?? 0)));
}

/** Eine einzelne Notiz oder undefined. */
export function getNote(id) {
  return db.notes.get(id);
}

/** Eine ID für eine noch nicht gespeicherte Notiz – siehe createNote(). */
export const newNoteId = newId;

/**
 * Legt eine Notiz an und gibt sie zurück.
 *
 * `id` kann vorgegeben werden: der Editor braucht die ID einer neuen Notiz
 * bereits vor dem Speichern, damit eingefügte Bilder ihr zugeordnet werden
 * können.
 *
 * `kind` steht beim Anlegen fest und ändert sich danach nicht mehr: 'text' ist
 * ein Textdokument (HTML im Body), 'list' eine Checkliste (JSON im Body).
 *
 * @param {{ id?: string, title?: string, body?: string, pinned?: number,
 *           kind?: 'text'|'list' }} input
 */
export async function createNote({ id, title = '', body = '', pinned = 0, kind = 'text' } = {}) {
  const now = Date.now();
  const note = {
    id: id ?? newId(),
    title: title.trim(),
    body,
    kind,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    pinned: pinned ? 1 : 0,
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
 * Aktualisiert Titel, Text und/oder Favoriten-Status.
 * `updatedAt` wird immer mitgeschrieben.
 *
 * @param {string} id
 * @param {{ title?: string, body?: string, pinned?: number|boolean }} changes
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
      if (changes.pinned !== undefined) note.pinned = changes.pinned ? 1 : 0;
    });

  if (modified === 0) {
    throw new Error(`Notiz ${id} existiert nicht (mehr).`);
  }
}

/** Favorit an/aus. Läuft über updateNote, zählt also als Änderung fürs Sync. */
export async function togglePinned(id) {
  const note = await db.notes.get(id);
  if (!note) throw new Error(`Notiz ${id} existiert nicht (mehr).`);
  await updateNote(id, { pinned: note.pinned ? 0 : 1 });
  return note.pinned ? 0 : 1;
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

/** `dirty` ist rein lokal – der Server kennt das Feld nicht. */
function toWireNote(note) {
  return {
    id: note.id,
    title: note.title ?? '',
    body: note.body ?? '',
    kind: note.kind === 'list' ? 'list' : 'text',
    createdAt: note.createdAt,
    updatedAt: note.updatedAt,
    deletedAt: note.deletedAt ?? null,
    pinned: note.pinned ? 1 : 0,
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

      await db.notes.put({
        ...remote,
        deletedAt: remote.deletedAt ?? null,
        pinned: remote.pinned ? 1 : 0,
        // Ein Server, der die Spalte noch nicht kennt, liefert kein `kind`.
        // Ohne Rückfallwert stünde die Notiz danach ohne Art in Dexie und
        // ließe sich nicht mehr öffnen.
        kind: remote.kind === 'list' ? 'list' : 'text',
        dirty: 0,
      });
      applied += 1;
    }

    await db.meta.put({ key: LAST_SYNCED_KEY, value: serverTime });
  });

  return applied;
}

// ---------------------------------------------------------------------------
// Bilder
// ---------------------------------------------------------------------------

/**
 * Legt ein eingefügtes Bild lokal ab und gibt seine ID zurück.
 *
 * Der Blob landet sofort in IndexedDB – dadurch ist das Bild auch offline
 * eingefügt und nach einem Neustart noch da. Der Upload passiert später im
 * Hintergrund (`dirty = 1`).
 */
export async function saveNoteImage({ noteId, blob }) {
  const image = {
    id: newId(),
    noteId,
    blob,
    mimeType: blob.type || 'image/png',
    size: blob.size,
    createdAt: Date.now(),
    deletedAt: null,
    dirty: 1,
  };
  await db.noteImages.add(image);
  return image;
}

export function getNoteImage(id) {
  return db.noteImages.get(id);
}

/** Bild, das vom Server kam, lokal vorhalten – gilt als bereits synchron. */
export async function cacheNoteImage({ id, noteId, blob }) {
  await db.noteImages.put({
    id,
    noteId: noteId ?? null,
    blob,
    mimeType: blob.type || 'application/octet-stream',
    size: blob.size,
    createdAt: Date.now(),
    deletedAt: null,
    dirty: 0,
  });
}

/** Bilder, die noch hochgeladen werden müssen. */
export function listImagesToUpload() {
  return db.noteImages.where('dirty').equals(1).filter((image) => image.deletedAt == null).toArray();
}

/** Bilder, deren Löschung der Server noch nicht kennt. */
export function listImagesToDelete() {
  return db.noteImages.filter((image) => image.deletedAt != null).toArray();
}

export async function markImageUploaded(id) {
  await db.noteImages.update(id, { dirty: 0 });
}

/** Nach erfolgreichem Löschen auf dem Server verschwindet auch die Zeile. */
export async function forgetImage(id) {
  await db.noteImages.delete(id);
}

/**
 * Bringt die Bilder einer Notiz mit ihrem Inhalt in Übereinstimmung.
 *
 * Aufzurufen nach jedem Speichern und nach dem Abbrechen: was im Body nicht
 * mehr vorkommt (Bild wieder gelöscht, Editor verworfen), wird als gelöscht
 * markiert. Der Sync räumt es danach auch auf dem Server weg.
 *
 * Die Markierung statt eines direkten Löschens ist wichtig für den Fall
 * „offline eingefügt, offline wieder entfernt": ein bereits hochgeladenes Bild
 * muss auch dann verschwinden, wenn gerade kein Netz da ist.
 *
 * @param {string} noteId
 * @param {string} bodyHtml maßgeblicher Inhalt ('' = Notiz verworfen)
 */
export async function reconcileNoteImages(noteId, bodyHtml) {
  const referenced = new Set(extractImageIds(bodyHtml));
  const images = await db.noteImages.where('noteId').equals(noteId).toArray();

  const orphans = images.filter((image) => image.deletedAt == null && !referenced.has(image.id));
  if (orphans.length === 0) return 0;

  await db.transaction('rw', db.noteImages, async () => {
    for (const image of orphans) {
      if (image.dirty === 1) {
        // War noch nie beim Server – lokal löschen genügt.
        await db.noteImages.delete(image.id);
      } else {
        await db.noteImages.update(image.id, { deletedAt: Date.now(), dirty: 1 });
      }
    }
  });

  return orphans.length;
}
