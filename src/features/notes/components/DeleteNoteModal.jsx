import { useState } from 'react';
import { Button, Group, Modal, Stack, Text } from '@mantine/core';

/**
 * Bestätigungsdialog vor dem endgültigen Löschen.
 */
export default function DeleteNoteModal({ opened, note, onClose, onConfirm }) {
  const [deleting, setDeleting] = useState(false);
  const label = note?.title?.trim() ? `„${note.title.trim()}“` : 'diese Notiz';

  async function handleConfirm() {
    setDeleting(true);
    try {
      await onConfirm();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Modal opened={opened} onClose={onClose} title="Notiz löschen" radius="md" centered size="sm">
      <Stack gap="lg">
        <Text size="sm">
          Soll {label} wirklich gelöscht werden? Das lässt sich nicht rückgängig machen.
        </Text>
        <Group justify="flex-end" gap="sm">
          <Button variant="default" onClick={onClose} disabled={deleting}>
            Abbrechen
          </Button>
          <Button color="red" onClick={handleConfirm} loading={deleting}>
            Löschen
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
