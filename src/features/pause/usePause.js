import { useLiveQuery } from 'dexie-react-hooks';

import { countRecords, getRecord, listRecords } from './pauseRepository.js';

/**
 * Lesen läuft über useLiveQuery: Dexie beobachtet die Tabelle und rendert die
 * Komponente nach jedem Schreibvorgang neu – auch, wenn dieser aus einem
 * anderen Browser-Tab oder aus dem Hintergrund-Sync kam. Deshalb brauchen die
 * Mutationen keinerlei Cache-Invalidierung; sie schreiben nur.
 *
 * Schreiben geht direkt über die (re-exportierten) Repository-Funktionen.
 */
export {
  createRecord,
  deleteRecord,
  getRecord,
  listRecords,
  newRecordId,
  updateRecord,
} from './pauseRepository.js';

/**
 * Alle aktiven Datensätze einer Tabelle.
 *
 * `records` ist undefined, solange die erste Abfrage läuft – daraus leitet
 * sich `isLoading` ab (wichtig, um „lädt noch" nicht als „nichts vorhanden"
 * zu zeigen).
 */
export function useRecords(table, options) {
  const index = options?.index;
  const reverse = options?.reverse;
  const records = useLiveQuery(
    () => listRecords(table, { index, reverse }),
    [table, index, reverse]
  );
  return { records: records ?? [], isLoading: records === undefined };
}

/**
 * Ein einzelner Datensatz, reaktiv.
 *
 * `undefined` heißt „wird noch geladen", `null` heißt „gibt es nicht".
 * Dexie liefert für beides undefined – ohne die Unterscheidung könnte eine
 * Detailseite einen gelöschten Datensatz nicht von einem langsamen Ladevorgang
 * unterscheiden und bliebe für immer im Ladezustand.
 */
export function useRecord(table, id) {
  const record = useLiveQuery(
    async () => (id ? ((await getRecord(table, id)) ?? null) : undefined),
    [table, id]
  );
  return { record, isLoading: id ? record === undefined : false };
}

/** Zeilenzahlen je Tabelle – für die Prüfseite. */
export function useRecordCounts() {
  const counts = useLiveQuery(() => countRecords(), []);
  return { counts: counts ?? null, isLoading: counts === undefined };
}
