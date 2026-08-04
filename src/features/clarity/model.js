/**
 * Form der Klarblick-Datensätze – absichtlich FREI VON REACT UND DEXIE.
 *
 * Dieselbe Trennung wie bei deviceModel.js im Smart-Home-Modul: die Regeln,
 * wie ein Datensatz aussieht und was ein gültiger Wert ist, lassen sich damit
 * in Node prüfen, ohne Browser und ohne IndexedDB.
 *
 * Hier stehen ausschließlich Struktur und Wertebereiche. Es gibt keine
 * Funktion, die einen Eintrag bewertet, einordnet oder aus seinem Inhalt etwas
 * ableitet – das ist eine Festlegung des Moduls und keine offene Aufgabe.
 */

/**
 * Die Tabellen, die synchronisiert werden.
 *
 * Genau eine: das Modul führt Gedankenprotokolle und sonst nichts. Die Liste
 * bleibt trotzdem eine Liste – Repository, Sync und Server-Schema sind
 * generisch über den Tabellennamen geschrieben, und das aufzulösen brächte
 * nur Zeilen, die bei einer zweiten Datenart wieder entstehen müssten.
 *
 * Der Denkfehler-Katalog steht nicht hier: das ist ein Nachschlagewerk im
 * Code (content/distortions.js), keine Nutzerdaten.
 */
export const SYNC_TABLES = ['thoughtRecords'];

/** Felder, die jeder Datensatz hat und die NICHT in den Payload gehören. */
export const ENVELOPE_FIELDS = ['id', 'createdAt', 'updatedAt', 'deletedAt', 'dirty'];

/**
 * Alle Intensitäts- und Glaubensangaben sind Ganzzahlen 0–100.
 *
 * Das ist die Skala des Arbeitsblattes und dieselbe, die in der Sitzung
 * benutzt wird. Keine 1–10-Skalen, keine Sterne – der Wert soll ohne
 * Umrechnen vorlesbar sein.
 */
export const SCALE_MIN = 0;
export const SCALE_MAX = 100;

/**
 * Bringt eine Zahl in den gültigen Bereich; alles Unbrauchbare wird null.
 *
 * null heißt „nicht angegeben" und ist ausdrücklich erlaubt: die meisten
 * Regler sind optional, und 0 wäre eine Aussage („glaube ich gar nicht")
 * statt einer fehlenden Angabe.
 */
export function clampScale(value) {
  if (value == null || value === '') return null;
  const number = Math.round(Number(value));
  if (!Number.isFinite(number)) return null;
  return Math.min(SCALE_MAX, Math.max(SCALE_MIN, number));
}

/**
 * Leerer Datensatz – die einzige Stelle, an der Standardwerte stehen.
 *
 * Die Felder folgen den Spalten des Arbeitsblattes, das in der Sitzung
 * benutzt wird, in dessen Reihenfolge:
 *
 *   Datum/Zeit · Situation · Automatischer Gedanke · Gefühl(e) ·
 *   Angemessene Reaktion darauf · Ergebnis
 *
 * Zahlenfelder starten auf null („noch nicht angegeben") statt auf 0.
 */
export function emptyRecord(table, input = {}) {
  if (table !== 'thoughtRecords') {
    throw new Error(`Unbekannte Klarblick-Tabelle: ${table}`);
  }

  return {
    // Spalte „Datum/Zeit" und „Situation"
    situationAt: Date.now(),
    situation: '',
    bodySensations: '',

    // Spalte „Automatischer Gedanke" – `beliefAfter` gehört zur Spalte
    // „Ergebnis", steht aber beim Gedanken, zu dem er gehört.
    automaticThoughts: [],

    // Spalte „Gefühl(e)" – `intensityAfter` ebenso.
    emotions: [],

    // Spalte „Angemessene Reaktion darauf": erst der Denkfehler (freiwillig),
    // dann die Antwort auf den Gedanken und wie sehr man ihr glaubt.
    distortionIds: [],
    response: '',
    responseBelief: null,

    // Spalte „Ergebnis": was ich tun werde bzw. getan habe.
    nextStep: '',

    status: 'draft',
    ...input,
  };
}

/**
 * Ein Eintrag in einer Unterliste (Gedanke, Gefühl).
 *
 * Diese Listen stehen im Datensatz selbst und bekommen keine eigene Tabelle –
 * dieselbe Überlegung wie bei den Checklisten-Notizen: eine eigene Tabelle
 * bräuchte ein zweites Sync-Protokoll samt eigener Tombstones, und weil man
 * ein Protokoll ohnehin als Ganzes bearbeitet, gewönne man dadurch nichts.
 * Die IDs dienen als stabiler React-Key und zur Zuordnung zwischen der Spalte
 * beim Schreiben und der Spalte „Ergebnis".
 */
export function newThought(text = '') {
  return { id: subId(), text, beliefBefore: null, beliefAfter: null };
}

export function newEmotion(label = '') {
  return { id: subId(), label, intensityBefore: null, intensityAfter: null };
}

/** Kurze ID für Unterlisten – muss nur innerhalb eines Datensatzes eindeutig sein. */
function subId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `sub-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
}
