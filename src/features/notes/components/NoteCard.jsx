import { ActionIcon, Badge, Card, Group, Menu, Stack, Text } from '@mantine/core';
import {
  IconDots,
  IconFileText,
  IconListCheck,
  IconPencil,
  IconPhoto,
  IconStar,
  IconStarFilled,
  IconTrash,
} from '@tabler/icons-react';

import { formatDateTime, formatRelativeDateTime } from '../../../lib/formatDate.js';
import { summarizeNoteBody } from '../lib/noteHtml.js';
import { summarizeList } from '../lib/noteList.js';
import classes from './NoteCard.module.scss';

/**
 * Eine Notiz in der Übersicht. Klick auf die Karte öffnet den Editor,
 * das Menü rechts bietet zusätzlich Favorit und Löschen an.
 *
 * Der Inhalt wird als Text ausgelesen und nicht als HTML eingesetzt: eine
 * Kachel braucht keine Formatierung, und so gibt es hier auch keine
 * Angriffsfläche über den Notiz-Inhalt. Aufgabenlisten sind die Ausnahme –
 * ihr Stand ist auf einen Blick nützlich und wird deshalb nachgebaut.
 */
export default function NoteCard({ note, onEdit, onTogglePinned, onDelete }) {
  const isList = note.kind === 'list';
  const hasTitle = note.title.length > 0;
  // Beide Zusammenfassungen liefern dieselbe Form – die Kachel muss darunter
  // nicht wissen, ob sie ein Dokument oder eine Liste zeigt.
  const summary = isList ? summarizeList(note.body) : summarizeNoteBody(note.body);
  const pinned = Boolean(note.pinned);
  const KindIcon = isList ? IconListCheck : IconFileText;

  return (
    <Card
      withBorder
      radius="md"
      padding="md"
      className={`${classes.card} ${pinned ? classes.pinned : ''}`}
    >
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
          <Group gap={6} wrap="nowrap">
            {pinned && <IconStarFilled size={13} className={classes.pinIcon} />}
            <KindIcon size={14} className={classes.kindIcon} />
            <Text
              fw={600}
              lineClamp={1}
              c={hasTitle ? undefined : 'dimmed'}
              fs={hasTitle ? undefined : 'italic'}
            >
              {hasTitle ? note.title : isList ? 'Liste ohne Titel' : 'Ohne Titel'}
            </Text>
          </Group>

          {summary.text.length > 0 && (
            <Text size="sm" c="dimmed" lineClamp={3} className={classes.preview}>
              {summary.text}
            </Text>
          )}

          {summary.tasks.length > 0 && (
            <Stack gap={2} mt={2}>
              {summary.tasks.map((task, index) => (
                <Group key={index} gap={6} wrap="nowrap">
                  <span className={classes.checkbox} data-checked={task.checked || undefined} />
                  <Text
                    size="xs"
                    c="dimmed"
                    lineClamp={1}
                    td={task.checked ? 'line-through' : undefined}
                  >
                    {task.text}
                  </Text>
                </Group>
              ))}
              {summary.tasksTotal > summary.tasks.length && (
                <Text size="xs" c="dimmed" pl={17}>
                  +{summary.tasksTotal - summary.tasks.length} weitere
                </Text>
              )}
            </Stack>
          )}

          <Group gap={6} mt={2} wrap="nowrap">
            {summary.imageCount > 0 && (
              <Badge
                size="xs"
                variant="light"
                color="gray"
                leftSection={<IconPhoto size={10} />}
              >
                {summary.imageCount}
              </Badge>
            )}
            {summary.tasksTotal > 0 && (
              <Badge size="xs" variant="light" color={summary.tasksDone === summary.tasksTotal ? 'teal' : 'gray'}>
                {summary.tasksDone}/{summary.tasksTotal} erledigt
              </Badge>
            )}
          </Group>

          <Text size="xs" c="dimmed" mt={2} title={formatDateTime(note.updatedAt)}>
            Geändert {formatRelativeDateTime(note.updatedAt)}
          </Text>
        </Stack>

        <Group gap={2} wrap="nowrap">
          <ActionIcon
            variant="subtle"
            color={pinned ? 'yellow' : 'gray'}
            aria-label={pinned ? 'Favorit aufheben' : 'Als Favorit markieren'}
            onClick={() => onTogglePinned(note)}
          >
            {pinned ? <IconStarFilled size={16} /> : <IconStar size={16} />}
          </ActionIcon>

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
                leftSection={pinned ? <IconStarFilled size={16} /> : <IconStar size={16} />}
                onClick={() => onTogglePinned(note)}
              >
                {pinned ? 'Favorit aufheben' : 'Favorit'}
              </Menu.Item>
              <Menu.Divider />
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
      </Group>
    </Card>
  );
}
