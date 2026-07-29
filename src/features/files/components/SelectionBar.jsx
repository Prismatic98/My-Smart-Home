import { Button, Group, Paper, Text } from '@mantine/core';
import { IconTrash, IconX } from '@tabler/icons-react';

import classes from '../Files.module.scss';

/** Erscheint, sobald etwas markiert ist, und ersetzt solange die Werkzeugleiste nicht. */
export default function SelectionBar({ count, onClear, onDelete }) {
  if (count === 0) return null;

  return (
    <Paper withBorder radius="md" p="xs" mb="sm" className={classes.selectionBar}>
      <Group justify="space-between" wrap="nowrap" gap="xs">
        <Text size="sm" fw={500}>
          {count === 1 ? '1 Eintrag ausgewählt' : `${count} Einträge ausgewählt`}
        </Text>
        <Group gap="xs" wrap="nowrap">
          <Button
            size="xs"
            variant="light"
            color="red"
            leftSection={<IconTrash size={14} />}
            onClick={onDelete}
          >
            Löschen
          </Button>
          <Button size="xs" variant="subtle" color="gray" leftSection={<IconX size={14} />} onClick={onClear}>
            Aufheben
          </Button>
        </Group>
      </Group>
    </Paper>
  );
}
