import { ActionIcon, Loader, Stack, Text } from '@mantine/core';
import { NodeViewWrapper } from '@tiptap/react';
import { IconPhotoOff, IconTrash } from '@tabler/icons-react';

import { useNoteImage } from '../useNoteImage.js';
import classes from '../Notes.module.scss';

/**
 * Darstellung eines Bildes im Editor.
 *
 * Im HTML der Notiz steht nur die ID – die Bytes kommen aus IndexedDB oder,
 * falls das Bild von einem anderen Gerät stammt, beim ersten Anzeigen vom
 * Backend (siehe useNoteImage).
 */
export default function NoteImageView({ node, deleteNode, editor }) {
  const { imageId } = node.attrs;
  const { url, status, error } = useNoteImage(imageId);
  const editable = editor.isEditable;

  return (
    <NodeViewWrapper className={classes.imageNode} data-status={status}>
      {status === 'loading' && (
        <Stack align="center" gap={6} py="md">
          <Loader size="sm" />
          <Text size="xs" c="dimmed">
            Bild wird geladen…
          </Text>
        </Stack>
      )}

      {status === 'error' && (
        <Stack align="center" gap={6} py="md">
          <IconPhotoOff size={22} />
          <Text size="xs" c="dimmed" ta="center">
            {/* Häufigster Fall: das Bild liegt auf einem anderen Gerät und es
                ist gerade kein Netz da. */}
            Bild nicht verfügbar
            {error?.message ? ` – ${error.message}` : ''}
          </Text>
        </Stack>
      )}

      {status === 'ready' && <img src={url} alt="" className={classes.image} draggable={false} />}

      {editable && (
        <ActionIcon
          variant="filled"
          color="dark"
          size="sm"
          radius="xl"
          className={classes.imageRemove}
          aria-label="Bild entfernen"
          onClick={() => deleteNode()}
        >
          <IconTrash size={14} />
        </ActionIcon>
      )}
    </NodeViewWrapper>
  );
}
