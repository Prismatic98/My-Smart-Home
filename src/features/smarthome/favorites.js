import Dexie from 'dexie';
import { useLiveQuery } from 'dexie-react-hooks';

/**
 * Favoriten und „zuletzt verwendet" für den Effekt-Picker.
 *
 * Reine Client-Daten: welche von 243 Szenen jemand oft benutzt, ist eine
 * Bedien-Vorliebe dieses Geräts und geht weder das Backend noch Home Assistant
 * etwas an. Deshalb Dexie ohne Sync – im Gegensatz zu den Notizen gibt es hier
 * keinen `dirty`-Zustand und keine Tombstones.
 *
 * Eigene Datenbank statt einer Tabelle in `smart-home-notes`: die Notizen-DB
 * hat ihre eigene Versionsgeschichte, und ein Migrationsfehler dort darf nicht
 * die Lampensteuerung mitnehmen.
 *
 * Der Schlüssel ist zusammengesetzt aus Gerät, Quelle und Name. Damit ist
 * „ist das schon ein Favorit?" ein direkter Schlüsselzugriff statt eines
 * Durchlaufs, und dieselbe Szene kann an zwei Geräten unabhängig angeheftet
 * werden. Die Zeitfelder heißen wie überall im Projekt `createdAt`/`updatedAt`.
 */
export const db = new Dexie('smart-home-smarthome');

/** So viele „zuletzt verwendet" behalten wir pro Gerät. */
export const RECENT_LIMIT = 8;

db.version(1).stores({
  // `id` = <deviceId>|<kind>|<name>, siehe entryId().
  effectFavorites: 'id, deviceId, createdAt',
  effectRecents: 'id, deviceId, updatedAt',
});

/**
 * Zusammengesetzter Schlüssel. Der Name kann alles enthalten (auch `|`), das
 * ist unkritisch: der Schlüssel muss eindeutig sein, nicht zerlegbar – die
 * Einzelteile stehen als eigene Felder im Datensatz.
 */
function entryId(deviceId, kind, name) {
  return `${deviceId}|${kind}|${name}`;
}

/** Favoriten eines Geräts, älteste zuerst angeheftet. */
export function useFavorites(deviceId) {
  return (
    useLiveQuery(
      () =>
        deviceId
          ? db.effectFavorites.where('deviceId').equals(deviceId).sortBy('createdAt')
          : Promise.resolve([]),
      [deviceId],
      []
    ) ?? []
  );
}

/** Zuletzt verwendete Einträge eines Geräts, neueste zuerst. */
export function useRecents(deviceId) {
  return (
    useLiveQuery(
      async () => {
        if (!deviceId) return [];
        const rows = await db.effectRecents.where('deviceId').equals(deviceId).sortBy('updatedAt');
        return rows.reverse().slice(0, RECENT_LIMIT);
      },
      [deviceId],
      []
    ) ?? []
  );
}

/** Heftet an oder löst ab; gibt zurück, ob der Eintrag danach ein Favorit ist. */
export async function toggleFavorite(deviceId, kind, name) {
  const id = entryId(deviceId, kind, name);
  const existing = await db.effectFavorites.get(id);

  if (existing) {
    await db.effectFavorites.delete(id);
    return false;
  }

  const now = Date.now();
  await db.effectFavorites.put({ id, deviceId, kind, name, createdAt: now, updatedAt: now });
  return true;
}

/**
 * Merkt eine Verwendung und hält die Liste auf RECENT_LIMIT.
 *
 * Aufgeräumt wird beim Schreiben, nicht beim Lesen: sonst wächst die Tabelle
 * still weiter, obwohl die Anzeige nur acht Einträge zeigt.
 */
export async function rememberUse(deviceId, kind, name) {
  const now = Date.now();
  await db.effectRecents.put({
    id: entryId(deviceId, kind, name),
    deviceId,
    kind,
    name,
    createdAt: now,
    updatedAt: now,
  });

  const rows = await db.effectRecents.where('deviceId').equals(deviceId).sortBy('updatedAt');
  const stale = rows.slice(0, Math.max(0, rows.length - RECENT_LIMIT));
  if (stale.length > 0) {
    await db.effectRecents.bulkDelete(stale.map((row) => row.id));
  }
}

/** Prüft eine Liste von Namen auf Favoriten-Status – für die Markierung im Picker. */
export function isFavorite(favorites, kind, name) {
  return favorites.some((entry) => entry.kind === kind && entry.name === name);
}
