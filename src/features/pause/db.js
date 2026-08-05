import Dexie from 'dexie';

/**
 * Lokale Datenbank des Innehalten-Moduls (IndexedDB via Dexie).
 *
 * Eigene Datenbank, nicht die der Notizen: das Modul hat einen eigenen
 * Sync-Endpunkt, einen eigenen Wasserstand und – anders als alles bisherige –
 * eine Komplettlöschung, die wirklich alles wegräumt. Mit gemeinsamer
 * Datenbank müsste die Löschung fremde Tabellen aussparen.
 *
 * Local-first wie überall: die Oberfläche liest und schreibt ausschließlich
 * hier. Der Abgleich mit dem Pi (pauseSync.js) läuft im Hintergrund und darf
 * nie blockieren. Offline ist bei diesem Modul der Normalfall, nicht die
 * Ausnahme – die Situationen, um die es geht, passieren unterwegs.
 *
 * Jeder synchronisierte Datensatz hat:
 *  - `id`         UUID vom Client, damit IDs über Geräte hinweg kollisionsfrei
 *                 sind.
 *  - `createdAt`  Millisekunden-Timestamps. `updatedAt` entscheidet
 *    `updatedAt`  Sync-Konflikte (last-write-wins).
 *  - `deletedAt`  null = aktiv, sonst Zeitpunkt des Löschens (Tombstone).
 *  - `dirty`      1 = lokal geändert, noch nicht beim Server angekommen.
 *
 * `deletedAt` bekommt nirgends einen Index: IndexedDB indiziert keine
 * null-Werte, der Index enthielte also ausgerechnet die aktiven Datensätze
 * nicht. Gefiltert wird in JS – dieselbe Entscheidung wie bei den Notizen.
 */
export const db = new Dexie('smart-home-pause');

/**
 * Die Datenbank hieß bis zum 05.08.2026 `smart-home-clarity`.
 *
 * IndexedDB kann eine Datenbank nicht umbenennen, also ist die neue leer und
 * die alte liegt daneben. Sie wird deshalb gelöscht: was niemand mehr anzeigen
 * kann, bleibt bei diesen Daten nicht liegen – dieselbe Begründung wie beim
 * Wegfall der sechs Arbeitsblätter in v2.
 *
 * Der Bestand kommt vom Pi zurück, sobald der erste Abgleich läuft (die
 * Tabelle dort wird umbenannt, nicht neu angelegt). Verloren geht nur, was auf
 * diesem Gerät entstanden und nie synchronisiert worden ist.
 *
 * `Dexie.delete` ist ein No-op, wenn es die Datenbank nicht gibt – der Aufruf
 * darf also bei jedem Start stehen bleiben. Ein Fehlschlag (etwa weil ein
 * zweiter Tab die alte Datenbank noch offen hält) bleibt folgenlos: dann liegt
 * sie beim nächsten Start eben noch da.
 */
Dexie.delete('smart-home-clarity').catch(() => {});

/**
 * v1 war auf sieben Arbeitsblätter angelegt (Experimente, Expositionsleiter,
 * Check-in und weitere). Das Modul beschränkt sich auf das Gedankenprotokoll
 * und den Denkfehler-Katalog; die Deklaration bleibt hier trotzdem stehen,
 * denn Dexie braucht die Vorgeschichte, um eine bestehende Datenbank
 * überhaupt auf v2 heben zu können.
 */
db.version(1).stores({
  thoughtRecords: 'id, updatedAt, createdAt, dirty, status, situationAt',
  experiments: 'id, updatedAt, createdAt, dirty, status, plannedFor',
  exposureSteps: 'id, updatedAt, createdAt, dirty, order, archived',
  exposureRuns: 'id, updatedAt, createdAt, dirty, stepId, startedAt',
  safetyBehaviors: 'id, updatedAt, createdAt, dirty, active',
  checkins: 'id, updatedAt, createdAt, dirty, &day',
  sessionNotes: 'id, updatedAt, createdAt, dirty, sessionAt',
  contacts: 'id',
  meta: 'key',
});

/**
 * v2: alles außer dem Gedankenprotokoll fällt weg.
 *
 * `null` löscht die Tabelle samt Inhalt. Das ist hier richtig und nicht nur
 * bequem: die Daten dieser Arbeitsblätter sind mit ihrer Oberfläche
 * verschwunden, und liegen zu lassen, was niemand mehr anzeigen kann,
 * widerspricht dem Umgang mit diesen Daten (siehe deleteRecord).
 *
 * Auf dem Pi bleiben die Zeilen bis zur nächsten Komplettlöschung stehen –
 * ohne Tombstone lässt sich ein Löschvorgang nicht weiterreichen, und der
 * Server kennt die Datenarten ohnehin nur als Zeichenkette.
 */
db.version(2).stores({
  thoughtRecords: 'id, updatedAt, createdAt, dirty, status, situationAt',
  experiments: null,
  exposureSteps: null,
  exposureRuns: null,
  safetyBehaviors: null,
  checkins: null,
  sessionNotes: null,
  contacts: null,
  // Wasserstand des letzten Syncs.
  meta: 'key',
});
