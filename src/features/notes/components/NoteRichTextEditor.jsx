import { useCallback, useEffect, useRef } from 'react';
import { FileButton, Tooltip } from '@mantine/core';
import { RichTextEditor } from '@mantine/tiptap';
import { useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { TaskItem, TaskList } from '@tiptap/extension-list';
import { Placeholder } from '@tiptap/extensions';
import { IconListCheck, IconPhotoPlus } from '@tabler/icons-react';

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
 */
export default function NoteRichTextEditor({ noteId, initialBody, onChange }) {
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

  /** Blobs ablegen und als Knoten einsetzen. */
  const insertImages = useCallback(
    async (files) => {
      for (const file of files) {
        const image = await saveNoteImage({ noteId, blob: file });
        editor?.chain().focus().insertNoteImage(image.id).run();
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

  // Beim Öffnen einer anderen Notiz den Inhalt austauschen, ohne den Editor
  // neu zu bauen. `emitUpdate: false`, damit das nicht als Änderung des
  // Nutzers zählt und die Notiz ungefragt als geändert markiert.
  useEffect(() => {
    if (!editor) return;
    const next = toEditorHtml(initialBody);
    if (editor.getHTML() !== next) {
      editor.commands.setContent(next, { emitUpdate: false });
    }
    // Nur bei Notizwechsel, nicht bei jedem Tastendruck.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor, noteId]);

  return (
    <RichTextEditor editor={editor} className={classes.editor}>
      <RichTextEditor.Toolbar sticky stickyOffset={0}>
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
      </RichTextEditor.Toolbar>

      <RichTextEditor.Content />
    </RichTextEditor>
  );
}

/** Bilder aus einem DataTransfer (Zwischenablage oder Drag & Drop). */
function imageFilesFrom(transfer) {
  return Array.from(transfer?.files ?? []).filter((file) => file.type.startsWith('image/'));
}
