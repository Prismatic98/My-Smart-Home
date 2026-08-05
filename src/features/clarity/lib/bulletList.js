/**
 * Aufzählungen in einem gewöhnlichen Textfeld – FREI VON REACT.
 *
 * Ausgelagert aus ListTextarea, damit sich die Regel in Node prüfen lässt:
 * Cursorpositionen sind genau die Art Logik, die man beim Ausprobieren im
 * Browser für richtig hält und die dann bei eingerückten oder leeren Zeilen
 * daneben liegt.
 */

/** Zeile mit Aufzählungszeichen: Einzug, Zeichen, Abstand, Inhalt. */
const BULLET = /^([ \t]*)([-*])([ \t]+)(.*)$/;

/**
 * Was beim Drücken von Enter passieren soll.
 *
 * @param {string} text  aktueller Feldinhalt
 * @param {number} caret Position des Cursors
 * @returns {{ text: string, caret: number } | null}
 *   neuer Inhalt samt Cursorposition – oder null, wenn Enter sich normal
 *   verhalten soll (keine Aufzählung in dieser Zeile).
 *
 * Zwei Fälle:
 *  - Die Zeile hat Inhalt → die nächste Zeile bekommt dasselbe Zeichen mit
 *    demselben Einzug.
 *  - Die Zeile ist ein leerer Punkt → das Zeichen verschwindet, die Aufzählung
 *    endet. Sonst käme man aus einer Liste nur mit Löschen wieder heraus.
 */
export function continueBulletList(text, caret) {
  const lineStart = text.lastIndexOf('\n', caret - 1) + 1;
  const match = BULLET.exec(text.slice(lineStart, caret));
  if (!match) return null;

  const [, indent, marker, spacing, content] = match;
  const empty = content.trim().length === 0;

  const before = empty ? text.slice(0, lineStart) : text.slice(0, caret);
  const insert = empty ? '\n' : `\n${indent}${marker}${spacing}`;

  return {
    text: `${before}${insert}${text.slice(caret)}`,
    caret: before.length + insert.length,
  };
}
