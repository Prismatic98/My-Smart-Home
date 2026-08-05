/**
 * Ableitungen rund um das Gedankenprotokoll – wie model.js FREI VON REACT UND
 * DEXIE, damit sich die Regeln in Node prüfen lassen.
 *
 * Hier steht nichts, was einen Eintrag bewertet. `stepHasContent()` beantwortet
 * ausschließlich „steht da schon etwas?" und dient der Wiederfindbarkeit beim
 * Fortsetzen – es ist kein Fortschritt, keine Vollständigkeitsprüfung und wird
 * nirgends zu einer Zahl verrechnet.
 */

import { isRichTextEmpty } from './richText.js';

/**
 * Die Schritte des Protokolls, in der Reihenfolge des Arbeitsblattes aus der
 * Sitzung. Dessen Spalten sind:
 *
 *   Datum/Zeit · Situation · Automatischer Gedanke · Gefühl(e) ·
 *   Angemessene Reaktion darauf · Ergebnis
 *
 * Die fünfte Spalte umfasst dort drei Dinge: den Denkfehler (freiwillig), die
 * Antwort auf den Gedanken und den Glauben an diese Antwort. Auf dem Handy
 * bekommt der Denkfehler einen eigenen Schritt – der Katalog ist zu lang, um
 * über einem Textfeld zu stehen. Damit sind es sechs Schritte statt fünf, aber
 * dieselbe Reihenfolge und derselbe Inhalt.
 *
 * `question` ist die Überschrift des Schrittes und immer eine Frage – die App
 * stellt Fragen und speichert Antworten.
 */
export const THOUGHT_STEPS = [
  {
    key: 'situation',
    label: 'Situation',
    question: 'Was war los?',
    hint: 'Ein Ereignis, ein Gedankengang, eine Erinnerung — was ging dem unangenehmen Gefühl voraus?',
  },
  {
    key: 'thoughts',
    label: 'Gedanken',
    question: 'Was ist dir durch den Kopf gegangen?',
    hint: 'Gedanken oder innere Bilder, in deinen eigenen Worten. Und wie sehr hast du ihnen in dem Moment geglaubt?',
  },
  {
    key: 'feelings',
    label: 'Gefühle',
    question: 'Was hast du in dem Moment gefühlt?',
    hint: 'Ein Wort je Gefühl — traurig, ängstlich, ärgerlich. Und wie stark es war.',
  },
  {
    key: 'distortions',
    label: 'Denkfehler',
    question: 'Steckt in dem Gedanken ein bekanntes Muster?',
    hint: 'Freiwillig. Aufklappen zeigt die Beschreibung.',
  },
  {
    key: 'response',
    label: 'Antwort',
    question: 'Was lässt sich dem Gedanken entgegnen?',
    hint: 'Und wie sehr glaubst du dieser Antwort?',
  },
  {
    key: 'outcome',
    label: 'Ergebnis',
    question: 'Wie steht es jetzt damit?',
    hint: 'Derselbe Gedanke, dasselbe Gefühl — noch einmal eingeschätzt. Und was du jetzt tust.',
  },
];

export const STEP_KEYS = THOUGHT_STEPS.map((step) => step.key);

/** Hält einen Schrittindex im gültigen Bereich (auch bei Unsinn in der URL). */
export function clampStepIndex(value) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(THOUGHT_STEPS.length - 1, Math.max(0, Math.trunc(value)));
}

/**
 * Steht in dem Feld etwas?
 *
 * Über den Rich-Text-Leser und nicht über `trim()`: die Felder enthalten HTML,
 * und ein leerer Editor liefert die Zeichenkette „<p></p>". Ohne das Auslesen
 * sähe jedes frisch angelegte Protokoll gefüllt aus – die Schrittleiste wäre
 * durchgehend markiert und kein leerer Entwurf würde je weggeräumt.
 */
function filled(value) {
  return typeof value === 'string' && !isRichTextEmpty(value);
}

/**
 * Steht in diesem Schritt schon etwas?
 *
 * Nur Text und getroffene Auswahlen zählen. Ein Regler allein macht einen
 * Schritt nicht „ausgefüllt": er steht auch dann irgendwo, wenn man ihn nie
 * angefasst hat.
 */
export function stepHasContent(key, record) {
  if (!record) return false;

  switch (key) {
    case 'situation':
      return filled(record.situation) || filled(record.bodySensations);
    case 'thoughts':
      return (record.automaticThoughts ?? []).some((thought) => filled(thought.text));
    case 'feelings':
      return (record.emotions ?? []).some((emotion) => filled(emotion.label));
    case 'distortions':
      return (record.distortionIds ?? []).length > 0;
    case 'response':
      return (
        filled(record.response) ||
        Object.values(record.responseAnswers ?? {}).some((answer) => filled(answer))
      );
    case 'outcome':
      return (
        filled(record.nextStep) ||
        (record.automaticThoughts ?? []).some((thought) => thought.beliefAfter != null) ||
        (record.emotions ?? []).some((emotion) => emotion.intensityAfter != null)
      );
    default:
      return false;
  }
}

/**
 * Ein Protokoll ohne jeden Inhalt.
 *
 * „Neues Protokoll" legt den Datensatz sofort an, weil der mehrstufige Editor
 * etwas zum Anhängen braucht. Wer ihn gleich wieder verlässt, soll keine leere
 * Karte in der Liste vorfinden – dasselbe Aufräummuster wie beim Listen-Editor
 * der Notizen.
 */
export function isEmptyThoughtRecord(record) {
  if (!record) return false;
  return STEP_KEYS.every((key) => !stepHasContent(key, record));
}

/**
 * Was die Karte in der Übersicht zeigt: **drei Dinge, jedes ungekürzt.**
 *
 *   Was war los · was ist mir durch den Kopf gegangen (und wie sehr habe ich
 *   es geglaubt, damals und jetzt) · was tue ich jetzt.
 *
 * Das ist der Ertrag eines Protokolls. Gefühle, Denkfehler und die Antwort auf
 * den Gedanken standen hier auch schon – aber eine Kachel, die alle sechs
 * Schritte wiedergibt, ist keine Übersicht mehr, sondern das Protokoll noch
 * einmal. Wer die Einzelheiten sehen will, öffnet es.
 *
 * Gekürzt wird nichts. Ein Protokoll, dessen Ergebnis nach zwei Zeilen mit „…"
 * abbricht, liest man nicht zu Ende und öffnet man auch nicht.
 *
 * **Zusammengestellt, nicht ausgewertet.** Hier wird nichts verrechnet und
 * nichts eingeordnet; die Werte stehen so da, wie sie eingetragen wurden. Die
 * Textfelder kommen unverändert als HTML durch – zerlegt und angezeigt werden
 * sie in der Kachel (RichTextView), damit diese Datei React-frei bleibt.
 */
export function summarizeThoughtRecord(record) {
  return {
    situation: filled(record.situation) ? record.situation : '',
    thoughts: (record.automaticThoughts ?? []).filter((thought) => filled(thought.text)),
    nextStep: filled(record.nextStep) ? record.nextStep : '',
    isDraft: record.status !== 'complete',
  };
}

// ---------------------------------------------------------------------------
// Zeitpunkt der Situation
// ---------------------------------------------------------------------------

/**
 * Zeitstempel → Wert für <input type="datetime-local">.
 *
 * Bewusst kein Datums-Paket: das Feld liefert auf Android und iOS den
 * systemeigenen Auswahldialog, den man mit einer Hand bedienen kann. Ein
 * nachgebauter Kalender in einem Modal wäre dort nur schlechter.
 *
 * Von Hand zusammengesetzt und nicht über toISOString(): das rechnet nach UTC
 * um und würde die Uhrzeit verschieben.
 */
export function toDateTimeInput(timestamp) {
  const date = new Date(timestamp ?? Date.now());
  if (Number.isNaN(date.getTime())) return '';

  const pad = (value) => String(value).padStart(2, '0');
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  );
}

/**
 * Wert aus <input type="datetime-local"> → Zeitstempel.
 *
 * Eine Angabe ohne Zeitzone liest JavaScript als lokale Zeit – genau richtig,
 * denn die Uhrzeit im Feld ist die des Nutzers. Bei leerem oder unbrauchbarem
 * Wert bleibt der bisherige Zeitpunkt stehen: ein halb getipptes Datum darf
 * den gespeicherten nicht löschen.
 */
export function fromDateTimeInput(value, fallback = Date.now()) {
  if (!value) return fallback;
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : fallback;
}
