import { backendRequest } from '../../lib/backend.js';
import {
  commitSyncResult,
  getLastSyncedAt,
  listDirtyRecords,
  wipeLocalData,
} from './clarityRepository.js';

/**
 * Ein Sync-Durchlauf: Push und Pull in einem Round-Trip.
 *
 *   1. Wasserstand (`since`) und alle lokal geänderten Datensätze (`dirty = 1`)
 *      aus Dexie holen.
 *   2. Beides an POST /clarity/sync schicken.
 *   3. Der Server wendet last-write-wins an und antwortet mit
 *      - `settled`:    unsere Datensätze, die er übernommen hat
 *      - `changes`:    alles, was er Neueres hat (inklusive Tombstones)
 *      - `serverTime`: der neue Wasserstand
 *   4. Antwort in einer Transaktion zurückschreiben.
 *
 * Konflikte entscheidet `updatedAt` – es gewinnt der spätere Schreibvorgang.
 * Bei zwei parallelen Bearbeitungen desselben Datensatzes geht damit eine
 * Fassung verloren; derselbe bewusste Kompromiss wie bei den Notizen.
 *
 * Der Durchlauf wird NICHT von einzelnen Änderungen ausgelöst, sondern läuft
 * im Takt aus useClaritySync.js. Das ist der Grund, warum ein Regler, den man
 * zwanzigmal hin- und herzieht, kein Sync-Feuerwerk auslöst: die Oberfläche
 * schreibt beim Loslassen einmal nach Dexie, der Abgleich kommt, wenn er
 * ohnehin drankommt.
 */
export async function syncClarity({ signal } = {}) {
  const since = await getLastSyncedAt();
  const pushed = await listDirtyRecords();

  const response = await backendRequest('/clarity/sync', {
    method: 'POST',
    body: { since, changes: pushed },
    signal,
  });

  const { applied, skipped } = await commitSyncResult({
    pushed,
    settled: response.settled ?? {},
    serverChanges: response.changes ?? {},
    serverTime: response.serverTime,
  });

  return {
    pushed: countAll(pushed),
    accepted: response.applied ?? 0,
    applied,
    /** Datensätze mit unlesbarem Inhalt – bleiben lokal unverändert stehen. */
    skipped,
    syncedAt: Date.now(),
  };
}

/**
 * Komplettlöschung: erst der Server, dann das Gerät.
 *
 * Die Reihenfolge ist wichtig. Andersherum wäre die lokale Datenbank leer,
 * der Wasserstand mit ihr weg, und der nächste Abgleich holte den gesamten
 * Bestand vom Pi zurück – „gelöscht" hätte dann für ein paar Sekunden
 * gestimmt. Schlägt der Server-Aufruf fehl, bricht die Funktion ab und die
 * Daten stehen unverändert auf beiden Seiten.
 *
 * Erst danach löscht sich das Gerät selbst. Andere Geräte im Tailnet behalten
 * ihren lokalen Bestand, bis sie das nächste Mal synchronisieren – Tombstones
 * gibt es hier bewusst nicht, und ohne sie kann ein Löschvorgang nicht
 * weitergereicht werden. Wer alles loswerden will, muss es auf jedem Gerät
 * auslösen; die Oberfläche sagt das an dieser Stelle auch.
 */
export async function wipeAllClarityData({ signal } = {}) {
  const response = await backendRequest('/clarity/all', { method: 'DELETE', signal });
  await wipeLocalData();
  return { deletedOnServer: response.deleted ?? 0 };
}

function countAll(changes) {
  return Object.values(changes).reduce((total, list) => total + list.length, 0);
}
