import { useEffect, useState } from 'react';
import { Alert, Button, Group, Modal, Stack, TextInput } from '@mantine/core';
import { IconAlertTriangle } from '@tabler/icons-react';

/**
 * Umbenennen. Bei Dateien wird beim Öffnen nur der Namensteil ohne Endung
 * markiert – das ist der Teil, den man in aller Regel ändern will.
 */
export default function RenameModal({ opened, entry, onClose, onSubmit, pending, error }) {
  const [name, setName] = useState('');

  useEffect(() => {
    if (opened && entry) setName(entry.name);
  }, [opened, entry]);

  const submit = () => {
    const trimmed = name.trim();
    if (trimmed && trimmed !== entry?.name && !pending) onSubmit(trimmed);
  };

  const selectBaseName = (event) => {
    const input = event.currentTarget;
    const value = input.value;
    const dot = value.lastIndexOf('.');
    const end = entry?.type === 'file' && dot > 0 ? dot : value.length;
    input.setSelectionRange(0, end);
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={entry?.type === 'dir' ? 'Ordner umbenennen' : 'Datei umbenennen'}
      radius="md"
      centered
      size="sm"
    >
      <Stack gap="md">
        {error && (
          <Alert color="red" variant="light" icon={<IconAlertTriangle size={18} />}>
            {error.message}
          </Alert>
        )}

        <TextInput
          data-autofocus
          label="Neuer Name"
          value={name}
          onFocus={selectBaseName}
          onChange={(event) => setName(event.currentTarget.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              submit();
            }
          }}
        />

        <Group justify="flex-end" gap="sm">
          <Button variant="default" onClick={onClose} disabled={pending}>
            Abbrechen
          </Button>
          <Button onClick={submit} loading={pending} disabled={!name.trim() || name.trim() === entry?.name}>
            Umbenennen
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
