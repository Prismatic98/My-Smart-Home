import { useEffect, useState } from 'react';
import { Alert, Button, Group, Modal, Stack, TextInput } from '@mantine/core';
import { IconAlertTriangle } from '@tabler/icons-react';

/**
 * Neuen Ordner anlegen. Enter bestätigt, Escape schließt (macht Mantine).
 * Der Fehler vom Server wird direkt angezeigt – seine Meldung ist bereits
 * für Menschen formuliert, z. B. bei einem schon vorhandenen Namen.
 */
export default function NewFolderModal({ opened, onClose, onSubmit, pending, error }) {
  const [name, setName] = useState('');

  // Beim Öffnen zurücksetzen, nicht beim Schließen – sonst springt der Text
  // während der Ausblend-Animation weg.
  useEffect(() => {
    if (opened) setName('');
  }, [opened]);

  const submit = () => {
    if (name.trim() && !pending) onSubmit(name.trim());
  };

  return (
    <Modal opened={opened} onClose={onClose} title="Neuer Ordner" radius="md" centered size="sm">
      <Stack gap="md">
        {error && (
          <Alert color="red" variant="light" icon={<IconAlertTriangle size={18} />}>
            {error.message}
          </Alert>
        )}

        <TextInput
          data-autofocus
          label="Name"
          placeholder="z. B. Rechnungen 2026"
          value={name}
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
          <Button onClick={submit} loading={pending} disabled={!name.trim()}>
            Anlegen
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
