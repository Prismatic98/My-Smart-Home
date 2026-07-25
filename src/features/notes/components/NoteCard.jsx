import { ActionIcon, Card, Group, Menu, Stack, Text } from '@mantine/core';
import { IconDots, IconPencil, IconTrash } from '@tabler/icons-react';

import { formatDateTime, formatRelativeDateTime } from '../../../lib/formatDate.js';
import classes from './NoteCard.module.scss';

/**
 * Eine Notiz in der Übersicht. Klick auf die Karte öffnet den Editor,
 * das Menü rechts bietet zusätzlich das Löschen an.
 */
export default function NoteCard({ note, onEdit, onDelete }) {
  const hasTitle = note.title.length > 0;

  return (
    <Card withBorder radius="md" padding="md" className={classes.card}>
      <Group justify="space-between" align="flex-start" wrap="nowrap" gap="xs">
        <Stack
          gap={6}
          className={classes.body}
          onClick={() => onEdit(note)}
          role="button"
          tabIndex={0}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              onEdit(note);
            }
          }}
        >
          <Text fw={600} lineClamp={1} c={hasTitle ? undefined : 'dimmed'} fs={hasTitle ? undefined : 'italic'}>
            {hasTitle ? note.title : 'Ohne Titel'}
          </Text>

          {note.body.trim().length > 0 && (
            <Text size="sm" c="dimmed" lineClamp={3} className={classes.preview}>
              {note.body}
            </Text>
          )}

          <Text size="xs" c="dimmed" mt={2} title={formatDateTime(note.updatedAt)}>
            Geändert {formatRelativeDateTime(note.updatedAt)}
          </Text>
        </Stack>

        <Menu position="bottom-end" withinPortal shadow="md">
          <Menu.Target>
            <ActionIcon variant="subtle" color="gray" aria-label="Aktionen für diese Notiz">
              <IconDots size={18} />
            </ActionIcon>
          </Menu.Target>
          <Menu.Dropdown>
            <Menu.Item leftSection={<IconPencil size={16} />} onClick={() => onEdit(note)}>
              Bearbeiten
            </Menu.Item>
            <Menu.Item
              color="red"
              leftSection={<IconTrash size={16} />}
              onClick={() => onDelete(note)}
            >
              Löschen
            </Menu.Item>
          </Menu.Dropdown>
        </Menu>
      </Group>
    </Card>
  );
}
