import { mergeAttributes, Node } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';

import NoteImageView from '../components/NoteImageView.jsx';

/**
 * Bild-Knoten für den Notiz-Editor.
 *
 * Gespeichert wird ausschließlich `<img data-image-id="…">` – kein `src`, und
 * schon gar kein Base64. Die Bytes liegen getrennt (lokal in IndexedDB, auf
 * dem Server als Datei), dadurch bleibt das Notiz-HTML klein und der Abgleich
 * schnell, auch wenn eine Notiz mehrere Screenshots enthält.
 *
 * `atom: true`, weil der Knoten keinen bearbeitbaren Inhalt hat und als Ganzes
 * ausgewählt, verschoben und gelöscht werden soll.
 */
export const NoteImage = Node.create({
  name: 'noteImage',
  group: 'block',
  atom: true,
  draggable: true,
  selectable: true,

  addAttributes() {
    return {
      imageId: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-image-id'),
        renderHTML: (attributes) =>
          attributes.imageId ? { 'data-image-id': attributes.imageId } : {},
      },
    };
  },

  parseHTML() {
    // Nur eigene Bilder übernehmen. Ein aus dem Web kopiertes <img src="http…">
    // fällt damit beim Einfügen heraus, statt eine fremde URL zu verewigen,
    // die morgen tot ist oder nach außen telefoniert.
    return [{ tag: 'img[data-image-id]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['img', mergeAttributes(HTMLAttributes)];
  },

  addNodeView() {
    return ReactNodeViewRenderer(NoteImageView);
  },

  addCommands() {
    return {
      insertNoteImage:
        (imageId) =>
        ({ commands }) =>
          commands.insertContent({ type: this.name, attrs: { imageId } }),
    };
  },
});
