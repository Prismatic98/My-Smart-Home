import { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Group,
  Loader,
  Modal,
  ScrollArea,
  Stack,
  Text,
  UnstyledButton,
} from '@mantine/core';
import { IconAlertTriangle, IconArrowUp, IconChevronRight, IconFolder } from '@tabler/icons-react';

import { joinPath, parentPath } from '../api.js';
import { useDirectory } from '../useFiles.js';
import classes from '../Files.module.scss';

/**
 * Zielordner auswählen.
 *
 * Bewusst ein eigener kleiner Browser statt Drag & Drop: auf dem Handy gibt
 * es kein Ziehen, und ein Ziel außerhalb des sichtbaren Ordners ließe sich so
 * gar nicht erreichen. Gezeigt werden nur Ordner.
 */
export default function MoveModal({ opened, entries = [], currentPath, onClose, onSubmit, pending, error }) {
  const [target, setTarget] = useState(currentPath);

  // Beim Öffnen im aktuellen Ordner starten – von dort ist der Weg zum Ziel
  // meist am kürzesten.
  useEffect(() => {
    if (opened) setTarget(currentPath);
  }, [opened, currentPath]);

  const directory = useDirectory(target);
  const folders = (directory.data?.entries ?? []).filter((entry) => entry.type === 'dir');

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

        <Group gap="xs" wrap="nowrap">
          <Button
            size="xs"
            variant="default"
            leftSection={<IconArrowUp size={14} />}
            disabled={target === '/'}
            onClick={() => setTarget(parentPath(target))}
          >
            Nach oben
          </Button>
          <Text size="sm" c="dimmed" lineClamp={1} title={target}>
            {target === '/' ? 'Ablage' : target}
          </Text>
        </Group>

        <ScrollArea.Autosize mah={280} type="auto" className={classes.movePicker}>
          {directory.isPending ? (
            <Group justify="center" py="lg">
              <Loader size="sm" />
            </Group>
          ) : folders.length === 0 ? (
            <Text size="sm" c="dimmed" py="lg" ta="center">
              Keine Unterordner – hierher verschieben ist trotzdem möglich.
            </Text>
          ) : (
            <Stack gap={2}>
              {folders.map((folder) => {
                const candidate = joinPath(target, folder.name);
                const disabled = isBlocked(candidate);

                return (
                  <UnstyledButton
                    key={folder.name}
                    className={classes.moveRow}
                    disabled={disabled}
                    data-disabled={disabled || undefined}
                    onClick={() => !disabled && setTarget(candidate)}
                  >
                    <Group gap="sm" wrap="nowrap">
                      <IconFolder size={18} />
                      <Text size="sm" lineClamp={1} style={{ flex: 1 }}>
                        {folder.name}
                      </Text>
                      {disabled ? (
                        <Text size="xs" c="dimmed">
                          wird verschoben
                        </Text>
                      ) : (
                        <IconChevronRight size={16} />
                      )}
                    </Group>
                  </UnstyledButton>
                );
              })}
            </Stack>
          )}
        </ScrollArea.Autosize>

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
