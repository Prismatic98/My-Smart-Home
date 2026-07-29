import { Button, Group, Paper, Text } from '@mantine/core';
import { IconArrowRight, IconTrash } from '@tabler/icons-react';

import classes from '../Files.module.scss';

/**
 * Erscheint, sobald etwas markiert ist.
 *
 * Ohne „Aufheben"-Knopf: ein erneuter Klick auf den Eintrag nimmt die
 * Markierung wieder weg, dafür braucht es keinen zweiten Weg.
 */
export default function SelectionBar({ count, onMove, onDelete }) {
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
            leftSection={<IconArrowRight size={14} />}
            onClick={onMove}
          >
            Verschieben
          </Button>
          <Button
            size="xs"
            variant="light"
            color="red"
            leftSection={<IconTrash size={14} />}
            onClick={onDelete}
          >
            Löschen
          </Button>
        </Group>
      </Group>
    </Paper>
  );
}
