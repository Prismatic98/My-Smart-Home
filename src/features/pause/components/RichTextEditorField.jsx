import { useRef } from 'react';
import { RichTextEditor } from '@mantine/tiptap';
import { useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Placeholder } from '@tiptap/extensions';

import { toEditorHtml } from '../lib/richText.js';
import classes from './RichTextField.module.scss';

/**
 * Der eigentliche Editor eines Textfeldes – wird über React.lazy geladen
 * (siehe RichTextField).
 *
 * **Das Schema ist bewusst klein:** Absätze, Aufzählungen, nummerierte Listen,
 * fett und kursiv. Überschriften, Zitate, Code, Trennlinien, Links und
 * Durchstreichen sind abgeschaltet. Ein Protokoll ist kein Dokument; und alles,
 * was hier entstehen kann, muss die Anzeige (RichTextView) auch darstellen
 * können – ein Schema, das über den Leser hinauswächst, verliert beim Anzeigen
 * seine Formatierung.
 *
 * Geschrieben wird bei jeder Änderung nach oben in den Entwurf; wann daraus ein
 * Schreibvorgang in Dexie wird, entscheidet `useRecordDraft` (Tippause,
 * Schrittwechsel, Verlassen des Feldes). Der Editor selbst kennt die Datenbank
 * nicht.
 *
 * Kein Effekt, der den Inhalt nachträglich austauscht: der lokale Stand führt,
 * solange der Editor offen ist. Käme jede gespeicherte Fassung zurück ins Feld,
 * überschriebe sie die Zeichen, die währenddessen getippt wurden. Denselben
 * Fehler hatte der Notizen-Editor schon einmal – dort steht auch, wie er sich
 * äußert (Absturz durch eine verworfene Editor-Instanz).
 */
export default function RichTextEditorField({
  value,
  onValueChange,
  onBlur,
  placeholder,
  ariaLabel,
  minHeight,
  autoFocus = false,
}) {
  // In Refs, damit die Editor-Instanz nicht bei jedem Tastendruck des
  // Elternteils neu aufgesetzt wird.
  const change = useRef(onValueChange);
  change.current = onValueChange;
  const blur = useRef(onBlur);
  blur.current = onBlur;

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        blockquote: false,
        code: false,
        codeBlock: false,
        horizontalRule: false,
        link: false,
        strike: false,
        underline: false,
      }),
      Placeholder.configure({ placeholder: placeholder ?? '' }),
    ],
    content: toEditorHtml(value),
    // 'end' und nicht true: der Cursor steht hinter dem, was schon dasteht.
    autofocus: autoFocus ? 'end' : false,
    editorProps: {
      attributes: {
        class: classes.content,
        'aria-label': ariaLabel ?? '',
        style: `min-height: ${minHeight}px`,
      },
    },
    onUpdate: ({ editor: instance }) => change.current?.(instance.getHTML()),
    onBlur: () => blur.current?.(),
  });

  return (
    <RichTextEditor editor={editor} className={classes.editor}>
      <RichTextEditor.Content />
    </RichTextEditor>
  );
}
