import { db } from './db.js';
import { ENVELOPE_FIELDS, SYNC_TABLES, emptyRecord } from './model.js';

/**
 * Datenzugriffsschicht des Klarblick-Moduls – die einzige Stelle, die Dexie
 * direkt anspricht. Komponenten nutzen die Hooks aus useClarity.js, der Sync
 * die Funktionen im unteren Teil dieser Datei.
 *
 * Die Funktionen sind generisch über den Tabellennamen. Aktuell gibt es nur
 * eine Tabelle; die Verallgemeinerung kostet hier nichts und hält die Stellen
 * klein, an denen ein Tombstone oder ein Zeitstempel falsch gesetzt werden
 * kann. Fachlogik steht nicht hier, sondern in model.js.
 *
 * Jede lokale Änderung setzt `dirty = 1`. Das ist die Merkliste für den Sync;
 * ein Vergleich „updatedAt neuer als letzter Sync?" wäre falsch, weil
 * `updatedAt` von der Geräteuhr kommt und der Wasserstand vom Server.
 */

const LAST_SYNCED_KEY = 'clarity:lastSyncedAt';

function newId() {
  // crypto.randomUUID gibt es nur in sicheren Kontexten (https/localhost).
  // Über Tailscale läuft die App mit HTTPS, der Fallback ist reine Vorsicht.
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `clarity-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
}

/** Eine ID für einen noch nicht gespeicherten Datensatz. */
export const newRecordId = newId;

function tableOf(table) {
  const store = db[table];
  if (!store || !SYNC_TABLES.includes(table)) {
    throw new Error(`Unbekannte Klarblick-Tabelle: ${table}`);
  }
  return store;
}

/**
 * Neuer `updatedAt`-Wert für eine Änderung – garantiert größer als der
 * bisherige Stand des Datensatzes.
 *
 * Normalerweise ist das schlicht Date.now(). Läuft aber die Uhr eines anderen
 * Geräts vor, kann ein hereinsynchronisierter Datensatz in der Zukunft liegen.
 * Mit reinem Date.now() wäre die eigene Bearbeitung dann rechnerisch älter,
 * würde bei last-write-wins verlieren und beim nächsten Sync kommentarlos
 * wieder überschrieben. Wer gerade etwas ändert, hat den aktuellen Stand vor
 * sich – seine Änderung muss also gewinnen.
 */
function nextTimestamp(previous) {
  return Math.max(Date.now(), (previous ?? 0) + 1);
}

// ---------------------------------------------------------------------------
// Lesen
// ---------------------------------------------------------------------------

/** Ein einzelner Datensatz oder undefined – auch Tombstones kommen zurück. */
export function getRecord(table, id) {
  return tableOf(table).get(id);
}

/**
 * Alle aktiven Datensätze einer Tabelle, zuletzt bearbeitete zuerst.
 *
 * Gelöschte werden herausgefiltert, statt sie per Index auszuschließen –
 * `deletedAt` ist bewusst nicht indiziert (siehe db.js).
 */
export function listRecords(table, { index = 'updatedAt', reverse = true } = {}) {
  const collection = tableOf(table).orderBy(index);
  return (reverse ? collection.reverse() : collection)
    .filter((record) => record.deletedAt == null)
    .toArray();
}

// ---------------------------------------------------------------------------
// Schreiben
// ---------------------------------------------------------------------------

/**
 * Legt einen Datensatz an und gibt ihn zurück.
 *
 * `id` kann vorgegeben werden: mehrstufige Formulare brauchen die ID, bevor
 * der erste Schritt gespeichert ist.
 */
export async function createRecord(table, input = {}) {
  const { id, ...fields } = input;
  const now = Date.now();
  const record = {
    ...emptyRecord(table, fields),
    id: id ?? newId(),
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    dirty: 1,
  };
  await tableOf(table).add(record);
  return record;
}

/**
 * Ändert einzelne Felder. `updatedAt` und `dirty` wandern immer mit.
 *
 * modify() statt update(): der neue Zeitstempel hängt vom alten ab, das muss
 * innerhalb einer Transaktion passieren.
 */
export async function updateRecord(table, id, changes) {
  const modified = await tableOf(table)
    .where('id')
    .equals(id)
    .modify((record) => {
      record.updatedAt = nextTimestamp(record.updatedAt);
      record.dirty = 1;
      for (const [key, value] of Object.entries(changes)) {
        // Die Hülle gehört dem Repository – wer sie von außen setzen könnte,
        // könnte den Sync aushebeln.
        if (ENVELOPE_FIELDS.includes(key)) continue;
        record[key] = value;
      }
    });

  if (modified === 0) {
    throw new Error(`Klarblick-Datensatz ${id} existiert nicht (mehr).`);
  }
}

/**
 * Löschen heißt: Tombstone setzen, nicht entfernen.
 *
 * Nur so erfahren andere Geräte überhaupt vom Löschen – eine verschwundene
 * Zeile ist von einer nie gesehenen nicht zu unterscheiden, das Gerät würde
 * den Datensatz beim nächsten Sync wieder hochladen.
 *
 * **Der Inhalt wird dabei sofort verworfen, nicht nur ausgeblendet.** Bei
 * Notizen bleibt er im Tombstone stehen; hier nicht. Ein gelöschtes
 * Gedankenprotokoll, dessen Text noch monatelang in IndexedDB und in der
 * SQLite-Datei des Pi liegt, ist genau das, was bei diesen Daten nicht
 * passieren soll. Übrig bleiben ID und Zeitstempel – mehr braucht der
 * Abgleich nicht.
 *
 * Die Kehrseite: es gibt kein Zurückholen. Deshalb fragt die Oberfläche vor
 * jedem Löschen nach.
 */
export async function deleteRecord(table, id) {
  const store = tableOf(table);
  await db.transaction('rw', store, async () => {
    const current = await store.get(id);
    if (!current) {
      throw new Error(`Klarblick-Datensatz ${id} existiert nicht (mehr).`);
    }
    if (current.deletedAt != null) return;

    const updatedAt = nextTimestamp(current.updatedAt);
    await store.put({
      id,
      createdAt: current.createdAt ?? updatedAt,
      updatedAt,
      // `updatedAt` wandert mit, damit das Löschen bei last-write-wins gegen
      // ältere Bearbeitungen auf anderen Geräten gewinnt.
      deletedAt: updatedAt,
      dirty: 1,
    });
  });
}

// ---------------------------------------------------------------------------
// Sync
// ---------------------------------------------------------------------------

/** Zeitpunkt (Server-Uhr) des letzten erfolgreichen Syncs, 0 = noch nie. */
export async function getLastSyncedAt() {
  const row = await db.meta.get(LAST_SYNCED_KEY);
  return row?.value ?? 0;
}

/**
 * `dirty` ist rein lokal, und der Inhalt geht als eine einzige Zeichenkette
 * über die Leitung.
 *
 * Der Server soll die Felder eines Protokolls nicht kennen: ohne Spalten gibt
 * es nichts zu indizieren, nichts versehentlich zu loggen und keine Migration,
 * wenn hier ein Feld dazukommt. Dieselbe Überlegung wie beim `body` einer
 * Notiz, nur konsequenter.
 *
 * Ein Tombstone trägt keinen Inhalt mehr – deletedAt-Datensätze sind lokal
 * schon geleert (siehe deleteRecord), das `{}` ist die Absicherung dagegen,
 * dass über einen anderen Weg doch etwas hineingerät.
 */
function toWire(record) {
  const fields = {};
  for (const [key, value] of Object.entries(record)) {
    if (ENVELOPE_FIELDS.includes(key)) continue;
    fields[key] = value;
  }

  return {
    id: record.id,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    deletedAt: record.deletedAt ?? null,
    payload: record.deletedAt == null ? JSON.stringify(fields) : '{}',
  };
}

/**
 * Macht aus einem Datensatz des Servers wieder einen lokalen.
 *
 * Lässt sich der Payload nicht lesen, gibt die Funktion null zurück und der
 * Aufrufer überspringt den Datensatz. Ein leeres Objekt einzusetzen wäre
 * schlimmer als nichts zu tun: der lokale, vollständige Stand würde durch eine
 * inhaltsleere Hülle ersetzt – dieselbe Überlegung wie beim Rückfall in
 * parseList() im Notizen-Modul.
 */
function fromWire(record) {
  let fields = {};
  if (record.deletedAt == null) {
    try {
      fields = JSON.parse(record.payload ?? '{}');
    } catch {
      return null;
    }
    if (fields === null || typeof fields !== 'object' || Array.isArray(fields)) return null;
  }

  return {
    ...fields,
    id: record.id,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    deletedAt: record.deletedAt ?? null,
    dirty: 0,
  };
}

/** Alle lokal geänderten Datensätze, nach Tabelle gruppiert. */
export async function listDirtyRecords() {
  const changes = {};

  for (const table of SYNC_TABLES) {
    const records = await db[table].where('dirty').equals(1).toArray();
    if (records.length > 0) changes[table] = records.map(toWire);
  }

  return changes;
}

/**
 * Schreibt das Ergebnis eines Sync-Durchlaufs zurück – in EINER Transaktion
 * über alle Tabellen, damit ein Abbruch mittendrin keinen halben Stand
 * hinterlässt. Insbesondere darf der Wasserstand nie vorrücken, ohne dass die
 * zugehörigen Datensätze angekommen sind.
 *
 * @param {object} result
 * @param {object} result.pushed       was wir hochgeschickt haben, nach Tabelle
 * @param {object} result.settled      IDs je Tabelle, die der Server übernommen hat
 * @param {object} result.serverChanges Datensätze je Tabelle, bei denen der Server neuer ist
 * @param {number} result.serverTime   neuer Wasserstand
 */
export async function commitSyncResult({ pushed, settled, serverChanges, serverTime }) {
  const stores = SYNC_TABLES.map((table) => db[table]);
  let applied = 0;
  let skipped = 0;

  await db.transaction('rw', ...stores, db.meta, async () => {
    for (const table of SYNC_TABLES) {
      const store = db[table];
      const accepted = new Set(settled?.[table] ?? []);

      for (const record of pushed?.[table] ?? []) {
        // Nicht übernommen = der Server war neuer. Dann bleibt `dirty` stehen,
        // bis die Server-Fassung unten eingespielt ist.
        if (!accepted.has(record.id)) continue;

        const current = await store.get(record.id);
        // Während des Requests kann weitergeschrieben worden sein – dann ist
        // der Datensatz erneut geändert und muss geändert bleiben.
        if (current && current.updatedAt === record.updatedAt) {
          await store.update(record.id, { dirty: 0 });
        }
      }

      for (const remote of serverChanges?.[table] ?? []) {
        const local = await store.get(remote.id);
        // Last-write-wins, auch hier: nur echte Neuerungen überschreiben.
        if (local && local.updatedAt >= remote.updatedAt) continue;

        const record = fromWire(remote);
        if (!record) {
          skipped += 1;
          continue;
        }

        await store.put(record);
        applied += 1;
      }
    }

    await db.meta.put({ key: LAST_SYNCED_KEY, value: serverTime });
  });

  return { applied, skipped };
}

/**
 * Räumt alles Lokale weg – Datensätze und Wasserstand.
 *
 * Echtes Löschen statt Tombstones, und deshalb nur aufzurufen, nachdem der
 * Server ebenfalls geleert wurde. Bliebe der Wasserstand stehen, käme beim
 * nächsten Abgleich nichts zurück und der Eindruck wäre trügerisch.
 */
export async function wipeLocalData() {
  const stores = SYNC_TABLES.map((table) => db[table]);

  await db.transaction('rw', ...stores, db.meta, async () => {
    for (const store of stores) await store.clear();
    await db.meta.clear();
  });
}

/** Anzahl der Datensätze je Tabelle – für die Debug- und Einstellungsseite. */
export async function countRecords() {
  const counts = {};

  for (const table of SYNC_TABLES) {
    const all = await db[table].toArray();
    counts[table] = {
      active: all.filter((record) => record.deletedAt == null).length,
      deleted: all.filter((record) => record.deletedAt != null).length,
      dirty: all.filter((record) => record.dirty === 1).length,
    };
  }

  return counts;
}
