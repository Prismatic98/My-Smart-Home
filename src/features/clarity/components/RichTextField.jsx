import { Suspense, lazy } from 'react';
import { Input, Skeleton } from '@mantine/core';

/**
 * TipTap samt ProseMirror ist das größte Einzelpaket der App. Es wird erst
 * geladen, wenn wirklich ein Protokoll geöffnet wird – Übersicht, Startseite
 * und die anderen Module bleiben davon unberührt. Alle Felder eines Schrittes
 * teilen sich denselben Chunk, geladen wird er also einmal.
 */
const RichTextEditorField = lazy(() => import('./RichTextEditorField.jsx'));

/** Höhe einer Zeile im Editor – muss zu `line-height` in der SCSS passen. */
const LINE = 24;

/**
 * Ein Textfeld des Protokolls.
 *
 * **Rich Text ohne Werkzeugleiste.** Was man hier schreibt, sind Sätze und
 * Aufzählungen; Überschriften, Zitate und Code gibt es im Schema gar nicht.
 * Eine Reihe Formatierungsknöpfe über jedem der neun Felder eines Protokolls
 * wäre lauter als der Inhalt und auf dem Handy im Weg. Wer trotzdem etwas
 * auszeichnen will, kann Strg+B und Strg+I benutzen.
 *
 * Der einzige sichtbare Unterschied zu einem gewöhnlichen Feld ist der, um den
 * es geht: „- " am Zeilenanfang wird zu einer echten Aufzählung mit Punkt,
 * „1. " zu einer nummerierten Liste. Enter setzt sie fort, Enter auf einem
 * leeren Punkt beendet sie.
 *
 * Beschriftung und Beschreibung laufen über `Input.Wrapper`, damit die Felder
 * genauso aussehen und genauso viel Abstand haben wie die übrigen Formulare
 * der App. `labelElement="div"`, weil ein `<label>` auf ein contenteditable
 * nicht zeigen kann – die Zuordnung macht `aria-label`.
 */
export default function RichTextField({ label, description, minRows = 3, ariaLabel, ...rest }) {
  const minHeight = minRows * LINE + 16;

  return (
    <Input.Wrapper label={label} description={description} labelElement="div">
      <Suspense fallback={<Skeleton height={minHeight} radius="sm" />}>
        <RichTextEditorField minHeight={minHeight} ariaLabel={ariaLabel ?? label} {...rest} />
      </Suspense>
    </Input.Wrapper>
  );
}
