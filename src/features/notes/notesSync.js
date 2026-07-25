import { backendRequest } from '../../lib/backend.js';
import { commitSyncResult, getLastSyncedAt, listDirtyNotes } from './notesRepository.js';

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
    syncedAt: Date.now(),
  };
}
