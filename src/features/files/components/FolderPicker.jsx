import { Button, Group, Loader, ScrollArea, Stack, Text, UnstyledButton } from '@mantine/core';
import { IconArrowUp, IconChevronRight, IconFolder } from '@tabler/icons-react';

import { joinPath, parentPath } from '../api.js';
import { useDirectory } from '../useFiles.js';
import classes from '../Files.module.scss';

/**
 * Zielordner auswählen.
 *
 * Bewusst ein eigener kleiner Browser statt Drag & Drop: auf dem Handy gibt es
 * kein Ziehen, und ein Ziel außerhalb des sichtbaren Ordners ließe sich so gar
 * nicht erreichen. Gezeigt werden nur Ordner.
 *
 * Der aktuelle Stand liegt beim Aufrufer (`value`/`onChange`) – der Dialog
 * braucht ihn für seine Knöpfe, und beim Verschieben hängt zusätzlich die
 * Sperrliste daran.
 */
export default function FolderPicker({ value, onChange, isBlocked, blockedLabel, emptyHint }) {
  const directory = useDirectory(value);
  const folders = (directory.data?.entries ?? []).filter((entry) => entry.type === 'dir');

  return (
    <>
      <Group gap="xs" wrap="nowrap">
        <Button
          size="xs"
          variant="default"
          leftSection={<IconArrowUp size={14} />}
          disabled={value === '/'}
          onClick={() => onChange(parentPath(value))}
        >
          Nach oben
        </Button>
        <Text size="sm" c="dimmed" lineClamp={1} title={value}>
          {value === '/' ? 'Ablage' : value}
        </Text>
      </Group>

      <ScrollArea.Autosize mah={280} type="auto" className={classes.movePicker}>
        {directory.isPending ? (
          <Group justify="center" py="lg">
            <Loader size="sm" />
          </Group>
        ) : folders.length === 0 ? (
          <Text size="sm" c="dimmed" py="lg" ta="center">
            {emptyHint}
          </Text>
        ) : (
          <Stack gap={2}>
            {folders.map((folder) => {
              const candidate = joinPath(value, folder.name);
              const disabled = Boolean(isBlocked?.(candidate));

              return (
                <UnstyledButton
                  key={folder.name}
                  className={classes.moveRow}
                  disabled={disabled}
                  data-disabled={disabled || undefined}
                  onClick={() => !disabled && onChange(candidate)}
                >
                  <Group gap="sm" wrap="nowrap">
                    <IconFolder size={18} />
                    <Text size="sm" lineClamp={1} style={{ flex: 1 }}>
                      {folder.name}
                    </Text>
                    {disabled ? (
                      <Text size="xs" c="dimmed">
                        {blockedLabel}
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
    </>
  );
}
