import { backendRequest } from '../../lib/backend.js';
import { deleteNoteImage, uploadNoteImage } from './imagesApi.js';
import {
  commitSyncResult,
  forgetImage,
  getLastSyncedAt,
  listDirtyNotes,
  listImagesToDelete,
  listImagesToUpload,
  markImageUploaded,
} from './notesRepository.js';

/**
 * Ein Sync-Durchlauf: Push und Pull in einem Round-Trip.
 *
 *   1. Wasserstand (`since`) und alle lokal geänderten Notizen (`dirty = 1`)
 *      aus Dexie holen.
 *   2. Beides an POST /notes/sync schicken.
 *   3. Der Server wendet last-write-wins an und antwortet mit
 *      - `settled`: unsere Notizen, die er übernommen hat
 *      - `notes`:   alles, was er Neueres hat (inklusive Tombstones)
 *      - `serverTime`: der neue Wasserstand
 *   4. Antwort in einer Transaktion zurückschreiben.
 *
 * Konflikte entscheidet `updatedAt` – gewinnt der spätere Schreibvorgang.
 * Bei zwei parallelen Bearbeitungen derselben Notiz geht damit eine Fassung
 * verloren; für eine private Notiz-App ist das der übliche und bewusst
 * gewählte Kompromiss gegenüber echtem Merging.
 *
 * Voraussetzung dafür sind halbwegs gleich laufende Uhren auf allen Geräten.
 * Der Wasserstand selbst ist davon unabhängig: der zählt in Server-Zeit
 * (siehe `serverUpdatedAt` im Backend).
 */
export async function syncNotes({ signal } = {}) {
  // Bilder zuerst: sobald ein anderes Gerät das Notiz-HTML bekommt, muss es
  // die darin referenzierten Bilder auch abrufen können.
  const images = await syncNoteImages();

  const since = await getLastSyncedAt();
  const pushed = await listDirtyNotes();

  const response = await backendRequest('/notes/sync', {
    method: 'POST',
    body: { since, notes: pushed },
    signal,
  });

  const applied = await commitSyncResult({
    pushed,
    settled: response.settled ?? [],
    serverNotes: response.notes ?? [],
    serverTime: response.serverTime,
  });

  return {
    pushed: pushed.length,
    accepted: response.applied ?? 0,
    applied,
    images,
    syncedAt: Date.now(),
  };
}

/**
 * Bilder hochladen und gelöschte auf dem Server wegräumen.
 *
 * Bewusst kein Pull: ein Bild wird erst geholt, wenn es angezeigt werden soll
 * (siehe useNoteImage). Wer eine Notiz nie öffnet, lädt ihre Bilder auch nie.
 *
 * Fehler einzelner Bilder brechen den Durchlauf nicht ab – der Rest soll
 * trotzdem durchgehen, und beim nächsten Lauf wird es erneut versucht.
 */
async function syncNoteImages() {
  let uploaded = 0;
  let removed = 0;
  let failed = 0;

  for (const image of await listImagesToUpload()) {
    try {
      await uploadNoteImage({ id: image.id, noteId: image.noteId, blob: image.blob });
      await markImageUploaded(image.id);
      uploaded += 1;
    } catch {
      failed += 1;
    }
  }

  for (const image of await listImagesToDelete()) {
    try {
      await deleteNoteImage(image.id);
      await forgetImage(image.id);
      removed += 1;
    } catch {
      failed += 1;
    }
  }

  return { uploaded, removed, failed };
}
