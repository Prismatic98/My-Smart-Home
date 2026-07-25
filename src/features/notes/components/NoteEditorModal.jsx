import { useEffect, useState } from 'react';
import { Button, Group, Modal, Stack, Text, TextInput, Textarea } from '@mantine/core';

import { formatDateTime } from '../../../lib/formatDate.js';

/**
 * Editor für neue und bestehende Notizen.
 *
 * Der Formularzustand lebt lokal in dieser Komponente und wird bei jedem
 * Öffnen aus `note` neu befüllt. Erst beim Speichern geht der Wert über
 * `onSubmit` an die Datenschicht – abbrechen verwirft also alles.
 */
export default function NoteEditorModal({ opened, note, onClose, onSubmit }) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [saving, setSaving] = useState(false);

  const isEdit = Boolean(note);

  useEffect(() => {
    if (opened) {
      setTitle(note?.title ?? '');
      setBody(note?.body ?? '');
      setSaving(false);
    }
  }, [opened, note]);

  const isEmpty = title.trim().length === 0 && body.trim().length === 0;

  async function handleSubmit(event) {
    event?.preventDefault();
    if (isEmpty || saving) return;

    setSaving(true);
    try {
      await onSubmit({ title, body });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={isEdit ? 'Notiz bearbeiten' : 'Neue Notiz'}
      size="lg"
      radius="md"
      centered
    >
      <form onSubmit={handleSubmit}>
        <Stack gap="md">
          <TextInput
            label="Titel"
            placeholder="Worum geht es?"
            value={title}
            onChange={(event) => setTitle(event.currentTarget.value)}
            data-autofocus
          />

          <Textarea
            label="Text"
            placeholder="Notiz…"
            value={body}
            onChange={(event) => setBody(event.currentTarget.value)}
            autosize
            minRows={6}
            maxRows={18}
            onKeyDown={(event) => {
              // Strg/Cmd + Enter speichert direkt aus dem Textfeld heraus
              if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
                handleSubmit(event);
              }
            }}
          />

          {isEdit && (
            <Text size="xs" c="dimmed">
              Erstellt {formatDateTime(note.createdAt)} · zuletzt geändert{' '}
              {formatDateTime(note.updatedAt)}
            </Text>
          )}

          <Group justify="flex-end" gap="sm">
            <Button variant="default" onClick={onClose} disabled={saving}>
              Abbrechen
            </Button>
            <Button type="submit" loading={saving} disabled={isEmpty}>
              Speichern
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
