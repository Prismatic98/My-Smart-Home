/**
 * Datenmodell der Checklisten.
 *
 * Eine Liste ist eine Notiz mit `kind: 'list'`. Ihre Einträge stehen als JSON
 * im vorhandenen `body`-Feld – nicht in einer eigenen Tabelle.
 *
 * Warum im Body: Der Sync (notesSync.js, POST /notes/sync) behandelt `body` als
 * undurchsichtige Zeichenkette und löst Konflikte per last-write-wins über
 * `updatedAt`. Eine eigene Tabelle für Einträge bräuchte ein zweites
 * Sync-Protokoll samt eigener Tombstones, und weil man eine Liste ohnehin als
 * Ganzes bearbeitet, gewönne man dadurch nichts. So kostet die Liste genau eine
 * neue Spalte (`kind`) und sonst nichts.
 *
 * Rein und ohne React – dadurch ohne Browser prüfbar.
 */

export const KIND_TEXT = 'text';
export const KIND_LIST = 'list';

/** Aktuelles Format des Listen-Bodys. Bei Änderungen hochzählen. */
const LIST_VERSION = 1;

/** Aufzählungszeichen, die beim Einfügen mehrerer Zeilen abgeschnitten werden. */
const BULLET_PREFIX = /^\s*(?:[-*•–—]|\[[ xX]?\]|\d+[.)])\s+/;

function newId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `item-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
}

/** Ein frischer, leerer Listen-Body. */
export function emptyListBody() {
  return serializeList([]);
}

export function serializeList(items) {
  return JSON.stringify({ version: LIST_VERSION, items });
}

/**
 * Einträge aus einem Body lesen.
 *
 * Fällt bewusst auf „Zeilen als Einträge" zurück, statt bei unbrauchbarem
 * Inhalt eine leere Liste zu liefern: Ein leeres Ergebnis würde beim nächsten
 * Speichern den echten Inhalt überschreiben. Der Rückfallweg greift auch, wenn
 * ein Textdokument nachträglich als Liste geöffnet wird.
 */
export function parseList(body) {
  const value = String(body ?? '').trim();
  if (!value) return [];

  if (value.startsWith('{')) {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed?.items)) return parsed.items.map(normalizeItem).filter(Boolean);
    } catch {
      // Kein gültiges JSON – unten als Text behandeln.
    }
  }

  return itemsFromText(stripTags(value));
}

function stripTags(value) {
  return /<[a-z][\s\S]*>/i.test(value)
    ? value
        .replace(/<\/(p|div|li|h[1-6])>/gi, '\n')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<[^>]+>/g, '')
    : value;
}

function normalizeItem(raw) {
  const text = String(raw?.text ?? '').trim();
  if (!text) return null;
  return {
    id: raw?.id ?? newId(),
    text,
    done: Boolean(raw?.done),
    createdAt: Number(raw?.createdAt) || Date.now(),
    doneAt: raw?.done ? Number(raw?.doneAt) || Date.now() : null,
  };
}

/** Erzeugt Einträge aus Text – eine Zeile je Eintrag, Aufzählungszeichen weg. */
export function itemsFromText(text) {
  return String(text ?? '')
    .split(/\r?\n/)
    .map((line) => line.replace(BULLET_PREFIX, '').trim())
    .filter(Boolean)
    .map(createItem);
}

export function createItem(text) {
  return {
    id: newId(),
    text: String(text).trim(),
    done: false,
    createdAt: Date.now(),
    doneAt: null,
  };
}

/**
 * Hängt einen oder mehrere Einträge an.
 * Mehrzeilige Eingabe (etwa aus der Zwischenablage) wird aufgeteilt – eine
 * kopierte Einkaufsliste landet damit in einem Rutsch als einzelne Punkte.
 */
export function addItems(items, text) {
  const added = itemsFromText(text);
  return added.length === 0 ? items : [...items, ...added];
}

export function toggleItem(items, id) {
  return items.map((item) => {
    if (item.id !== id) return item;
    const done = !item.done;
    return { ...item, done, doneAt: done ? Date.now() : null };
  });
}

export function renameItem(items, id, text) {
  const trimmed = String(text).trim();
  if (!trimmed) return removeItem(items, id);
  return items.map((item) => (item.id === id ? { ...item, text: trimmed } : item));
}

export function removeItem(items, id) {
  return items.filter((item) => item.id !== id);
}

/** Entfernt alle erledigten Einträge. */
export function clearDone(items) {
  return items.filter((item) => !item.done);
}

/**
 * Anzeigereihenfolge: offene Punkte zuerst in der Reihenfolge ihrer Eingabe,
 * erledigte darunter – zuletzt Abgehaktes oben.
 *
 * Das zuletzt angetippte Kästchen landet damit direkt unterhalb der offenen
 * Punkte statt ganz unten. Ein Versehen ist so ohne Scrollen zurückzunehmen.
 */
export function splitItems(items) {
  return {
    open: items.filter((item) => !item.done),
    done: items.filter((item) => item.done).sort((a, b) => (b.doneAt ?? 0) - (a.doneAt ?? 0)),
  };
}

export function sortItems(items) {
  const { open, done } = splitItems(items);
  return [...open, ...done];
}

export function listStats(items) {
  const done = items.filter((item) => item.done).length;
  return { total: items.length, done, open: items.length - done };
}

/** Wie viele Einträge in die Kachelvorschau wandern. */
const PREVIEW_ITEMS = 4;

/**
 * Zusammenfassung für die Kachel – in derselben Form wie summarizeNoteBody(),
 * damit NoteCard beide Notizarten gleich rendern kann.
 */
export function summarizeList(body) {
  const items = parseList(body);
  const { total, done } = listStats(items);

  return {
    text: '',
    imageCount: 0,
    tasksTotal: total,
    tasksDone: done,
    tasks: sortItems(items)
      .slice(0, PREVIEW_ITEMS)
      .map((item) => ({ text: item.text, checked: item.done })),
  };
}
