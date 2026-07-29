/**
 * Helfer rund um den HTML-Inhalt einer Notiz.
 *
 * Der Editor (TipTap) liefert HTML, das auf sein Schema beschränkt ist –
 * Unbekanntes wird beim Einfügen verworfen. Trotzdem wird der Inhalt in der
 * Übersicht nie als HTML eingesetzt, sondern nur als Text ausgelesen: eine
 * Kachel muss keine Formatierung zeigen, und so gibt es dort auch keine
 * Angriffsfläche.
 */

/** Erkennt, ob ein Body noch aus der Klartext-Zeit stammt. */
export function looksLikeHtml(value) {
  return /<[a-z][\s\S]*>/i.test(value ?? '');
}

/**
 * Klartext in HTML überführen: Zeilen werden Absätze, Sonderzeichen maskiert.
 * Wird für Notizen gebraucht, die vor dem Rich-Text-Editor entstanden sind.
 */
export function textToHtml(text) {
  const value = String(text ?? '');
  if (!value.trim()) return '';

  return value
    .split(/\r?\n/)
    .map((line) => (line.trim() ? `<p>${escapeHtml(line)}</p>` : '<p></p>'))
    .join('');
}

/** Body in der Form, die der Editor erwartet – auch für Alt-Notizen. */
export function toEditorHtml(body) {
  const value = String(body ?? '');
  return looksLikeHtml(value) ? value : textToHtml(value);
}

function escapeHtml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

/** IDs aller Bilder, die im Body vorkommen. */
export function extractImageIds(html) {
  if (!html) return [];
  const ids = new Set();
  for (const match of String(html).matchAll(/data-image-id="([^"]+)"/g)) {
    ids.add(match[1]);
  }
  return [...ids];
}

/** Wie viele Aufgaben aus einer Liste in die Vorschau wandern. */
const PREVIEW_TASKS = 4;

/**
 * Fasst einen Body für die Kachelansicht zusammen: Text, Bilderzahl und der
 * Stand der Aufgabenliste.
 */
export function summarizeNoteBody(html) {
  const empty = { text: '', imageCount: 0, tasksTotal: 0, tasksDone: 0, tasks: [] };
  const value = String(html ?? '');
  if (!value.trim()) return empty;

  if (!looksLikeHtml(value)) {
    return { ...empty, text: value.replace(/\s+/g, ' ').trim() };
  }

  const doc = new DOMParser().parseFromString(value, 'text/html');

  const items = [...doc.querySelectorAll('li[data-checked]')];
  const tasks = items.slice(0, PREVIEW_TASKS).map((item) => ({
    text: (item.textContent ?? '').trim(),
    checked: item.getAttribute('data-checked') === 'true',
  }));

  // Aufgaben stehen schon als eigene Liste in der Vorschau – aus dem Fließtext
  // sollen sie nicht noch ein zweites Mal auftauchen.
  for (const item of items) item.remove();

  return {
    text: (doc.body.textContent ?? '').replace(/\s+/g, ' ').trim(),
    imageCount: doc.querySelectorAll('img[data-image-id]').length,
    tasksTotal: items.length,
    tasksDone: items.filter((item) => item.getAttribute('data-checked') === 'true').length,
    tasks,
  };
}
