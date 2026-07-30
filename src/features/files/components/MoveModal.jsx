import { useEffect, useState } from 'react';
import { Alert, Button, Group, Modal, Stack } from '@mantine/core';
import { IconAlertTriangle } from '@tabler/icons-react';

import { joinPath } from '../api.js';
import FolderPicker from './FolderPicker.jsx';

/**
 * Einträge in einen anderen Ordner verschieben. Das Ziel wird über den
 * gemeinsamen Ordner-Browser gewählt (siehe FolderPicker).
 */
export default function MoveModal({ opened, entries = [], currentPath, onClose, onSubmit, pending, error }) {
  const [target, setTarget] = useState(currentPath);

  // Beim Öffnen im aktuellen Ordner starten – von dort ist der Weg zum Ziel
  // meist am kürzesten.
  useEffect(() => {
    if (opened) setTarget(currentPath);
  }, [opened, currentPath]);

  // Ein Ordner kann nicht in sich selbst wandern, und wo die Einträge schon
  // liegen, gibt es nichts zu tun.
  const movingFolders = entries.filter((entry) => entry.type === 'dir');
  const blocked = movingFolders.map((entry) => joinPath(currentPath, entry.name));
  const isBlocked = (candidate) =>
    blocked.some((source) => candidate === source || candidate.startsWith(`${source}/`));

  const unchanged = target === currentPath;
  const label = entries.length === 1 ? `„${entries[0].name}"` : `${entries.length} Einträge`;

  return (
    <Modal opened={opened} onClose={onClose} title={`${label} verschieben`} radius="md" centered size="md">
      <Stack gap="sm">
        {error && (
          <Alert color="red" variant="light" icon={<IconAlertTriangle size={18} />}>
            {error.message}
          </Alert>
        )}

        <FolderPicker
          value={target}
          onChange={setTarget}
          isBlocked={isBlocked}
          blockedLabel="wird verschoben"
          emptyHint="Keine Unterordner – hierher verschieben ist trotzdem möglich."
        />

        <Group justify="flex-end" gap="sm">
          <Button variant="default" onClick={onClose} disabled={pending}>
            Abbrechen
          </Button>
          <Button onClick={() => onSubmit(target)} loading={pending} disabled={unchanged}>
            {unchanged ? 'Schon hier' : 'Hierher verschieben'}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
