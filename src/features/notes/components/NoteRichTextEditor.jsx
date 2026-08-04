import { useCallback, useRef, useState } from 'react';
import { FileButton, Tooltip } from '@mantine/core';
import { RichTextEditor } from '@mantine/tiptap';
import { useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { TaskItem, TaskList } from '@tiptap/extension-list';
import { Placeholder } from '@tiptap/extensions';
import { IconListCheck, IconPhotoPlus, IconTypography } from '@tabler/icons-react';

import { NoteImage } from '../extensions/noteImageNode.js';
import { toEditorHtml } from '../lib/noteHtml.js';
import { saveNoteImage } from '../notesRepository.js';
import classes from '../Notes.module.scss';

/**
 * Rich-Text-Editor für Notizen.
 *
 * Wird über React.lazy geladen (siehe NoteEditorModal): TipTap samt
 * ProseMirror ist das größte Einzelpaket der App und wird nur gebraucht, wenn
 * wirklich eine Notiz geöffnet wird.
 *
 * Bilder kommen per Einfügen aus der Zwischenablage oder über den Knopf in der
 * Werkzeugleiste. Sie wandern sofort als Blob in IndexedDB und stehen im
 * Dokument nur als ID – hochgeladen wird später im Hintergrund.
 *
 * Die Formatierungsknöpfe sind standardmäßig eingeklappt. Die meisten Notizen
 * sind schlichter Text; auf dem Handy fraßen zwei Reihen Werkzeuge den halben
 * sichtbaren Bereich, bevor das erste Wort geschrieben war. Sichtbar bleibt nur
 * der Umschalter.
 */
export default function NoteRichTextEditor({ noteId, initialBody, onChange }) {
  const [toolsOpen, setToolsOpen] = useState(false);

  // In einem Ref, damit die Editor-Instanz nicht bei jedem Tastendruck des
  // Elternteils neu aufgesetzt wird.
  const changeHandler = useRef(onChange);
  changeHandler.current = onChange;

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        link: {
          openOnClick: false,
          autolink: true,
          // Nur Web-Links. javascript:-URLs kommen damit nicht ins Dokument.
          protocols: ['http', 'https', 'mailto'],
          HTMLAttributes: { rel: 'noopener noreferrer nofollow', target: '_blank' },
        },
      }),
      TaskList,
      // Verschachtelte Aufgabenlisten, wie man sie von Einkaufslisten kennt.
      TaskItem.configure({ nested: true }),
      Placeholder.configure({ placeholder: 'Schreib etwas … Bilder einfach einfügen (Strg+V)' }),
      NoteImage,
    ],
    content: toEditorHtml(initialBody),
    editorProps: {
      attributes: { class: classes.editorContent },
      handlePaste: (_view, event) => handleImagePaste(event),
      handleDrop: (_view, event) => handleImageDrop(event),
    },
    onUpdate: ({ editor: instance }) => changeHandler.current?.(instance.getHTML()),
  });

  /**
   * Blobs ablegen und als Knoten einsetzen.
   *
   * Nach dem await auf isDestroyed prüfen: wer das Modal währenddessen
   * schließt, hinterlässt hier eine zerstörte Editor-Instanz. Das Bild bleibt
   * gespeichert, wird aber nirgends eingefügt – reconcileNoteImages() räumt es
   * beim Schließen wieder weg.
   */
  const insertImages = useCallback(
    async (files) => {
      for (const file of files) {
        const image = await saveNoteImage({ noteId, blob: file });
        if (!editor || editor.isDestroyed) return;
        editor.chain().focus().insertNoteImage(image.id).run();
      }
    },
    [editor, noteId]
  );

  /**
   * Bilder aus der Zwischenablage. Rückgabe true heißt: TipTap soll das
   * Ereignis nicht weiter behandeln – sonst landete zusätzlich der HTML-Rest
   * des Clipboards im Dokument.
   */
  const handleImagePaste = useCallback(
    (event) => {
      const files = imageFilesFrom(event.clipboardData);
      if (files.length === 0) return false;
      event.preventDefault();
      void insertImages(files);
      return true;
    },
    [insertImages]
  );

  const handleImageDrop = useCallback(
    (event) => {
      const files = imageFilesFrom(event.dataTransfer);
      if (files.length === 0) return false;
      event.preventDefault();
      void insertImages(files);
      return true;
    },
    [insertImages]
  );

  // Kein Effekt, der den Inhalt nachträglich austauscht: NoteEditorModal
  // rendert diese Komponente mit `key={noteId}`, jede Notiz bekommt also
  // ohnehin eine frische Editor-Instanz mit dem richtigen `content`.
  //
  // Ein solcher Effekt hatte hier zuverlässig einen Absturz erzeugt: useEditor
  // verwirft die zuerst erzeugte Instanz und legt eine neue an, während die
  // Variable im laufenden Render-Durchlauf noch auf die alte zeigt. Der Aufruf
  // von getHTML() traf dann eine zerstörte Instanz (schema === null).

  return (
    <RichTextEditor editor={editor} className={classes.editor}>
      <RichTextEditor.Toolbar sticky stickyOffset={0}>
        {/* Der Umschalter steht immer da und bleibt an derselben Stelle –
            die Werkzeuge klappen rechts daneben auf, nicht darüber. */}
        <RichTextEditor.ControlsGroup>
          <Tooltip
            label={toolsOpen ? 'Formatierung ausblenden' : 'Formatierung einblenden'}
            withArrow
          >
            <RichTextEditor.Control
              onClick={() => setToolsOpen((value) => !value)}
              active={toolsOpen}
              aria-label="Formatierung ein- oder ausblenden"
              aria-expanded={toolsOpen}
            >
              <IconTypography size={16} />
            </RichTextEditor.Control>
          </Tooltip>
        </RichTextEditor.ControlsGroup>

        {toolsOpen && (
          <>
            <RichTextEditor.ControlsGroup>
              <RichTextEditor.Bold />
              <RichTextEditor.Italic />
              <RichTextEditor.Strikethrough />
              <RichTextEditor.Code />
            </RichTextEditor.ControlsGroup>

            <RichTextEditor.ControlsGroup>
              <RichTextEditor.H2 />
              <RichTextEditor.H3 />
            </RichTextEditor.ControlsGroup>

            <RichTextEditor.ControlsGroup>
              <RichTextEditor.BulletList />
              <RichTextEditor.OrderedList />
              {/* Aufgabenliste bringt Mantine nicht mit – eigener Knopf. */}
              <Tooltip label="Aufgabenliste" withArrow>
                <RichTextEditor.Control
                  onClick={() => editor?.chain().focus().toggleTaskList().run()}
                  active={editor?.isActive('taskList')}
                  aria-label="Aufgabenliste"
                >
                  <IconListCheck size={16} />
                </RichTextEditor.Control>
              </Tooltip>
            </RichTextEditor.ControlsGroup>

            <RichTextEditor.ControlsGroup>
              <RichTextEditor.Link />
              <RichTextEditor.Unlink />
              <RichTextEditor.Blockquote />
              <RichTextEditor.Hr />
            </RichTextEditor.ControlsGroup>

            <RichTextEditor.ControlsGroup>
              <FileButton accept="image/*" multiple onChange={(files) => void insertImages(files)}>
                {(props) => (
                  <Tooltip label="Bild einfügen" withArrow>
                    <RichTextEditor.Control {...props} aria-label="Bild einfügen">
                      <IconPhotoPlus size={16} />
                    </RichTextEditor.Control>
                  </Tooltip>
                )}
              </FileButton>
            </RichTextEditor.ControlsGroup>

            <RichTextEditor.ControlsGroup>
              <RichTextEditor.Undo />
              <RichTextEditor.Redo />
            </RichTextEditor.ControlsGroup>
          </>
        )}
      </RichTextEditor.Toolbar>

      <RichTextEditor.Content />
    </RichTextEditor>
  );
}

/** Bilder aus einem DataTransfer (Zwischenablage oder Drag & Drop). */
function imageFilesFrom(transfer) {
  return Array.from(transfer?.files ?? []).filter((file) => file.type.startsWith('image/'));
}
