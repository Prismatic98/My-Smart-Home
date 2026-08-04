import { ActionIcon, Badge, Card, Group, Menu, Stack, Text } from '@mantine/core';
import { IconDots, IconPencil, IconTrash } from '@tabler/icons-react';

import { formatDateTime } from '../../../lib/formatDate.js';
import { summarizeThoughtRecord } from '../lib/thoughtRecord.js';
import classes from './ThoughtRecordCard.module.scss';

/**
 * Ein Gedankenprotokoll in der Übersicht.
 *
 * Gezeigt wird, woran man es wiedererkennt: wann es war, die Situation, der
 * erste Gedanke, die genannten Gefühle. Keine Werte, keine Verläufe, keine
 * Bewertung – die Karte ist ein Wiederfinden-Helfer, keine Zusammenfassung
 * dessen, wie es einem ging.
 *
 * Oben steht der Zeitpunkt der Situation, nicht das Änderungsdatum: gesucht
 * wird nach „das Gespräch am Dienstag", nicht danach, wann zuletzt getippt
 * wurde.
 */
export default function ThoughtRecordCard({ record, onOpen, onDelete }) {
  const summary = summarizeThoughtRecord(record);
  const hasHeadline = summary.headline.length > 0;

  return (
    <Card withBorder radius="md" padding="md" className={classes.card}>
      <Group justify="space-between" align="flex-start" wrap="nowrap" gap="xs">
        <Stack
          gap={8}
          className={classes.body}
          role="button"
          tabIndex={0}
          onClick={() => onOpen(record)}
          onKeyDown={(event) => {
            if (event.key !== 'Enter' && event.key !== ' ') return;
            event.preventDefault();
            onOpen(record);
          }}
        >
          <Group gap={8} align="center" wrap="nowrap">
            <Text size="xs" c="dimmed" className={classes.date}>
              {formatDateTime(record.situationAt ?? record.createdAt)}
            </Text>
            {summary.isDraft && (
              <Badge size="xs" variant="default" className={classes.draft}>
                Entwurf
              </Badge>
            )}
          </Group>

          <Text
            fw={600}
            lineClamp={2}
            c={hasHeadline ? undefined : 'dimmed'}
            fs={hasHeadline ? undefined : 'italic'}
            className={classes.headline}
          >
            {hasHeadline ? summary.headline : 'Noch ohne Inhalt'}
          </Text>

          {summary.leadThought.length > 0 && (
            <Text size="sm" c="dimmed" lineClamp={2} className={classes.thought}>
              {summary.leadThought}
            </Text>
          )}

          {summary.emotions.length > 0 && (
            <Group gap={4} wrap="wrap" mt={2}>
              {summary.emotions.slice(0, 4).map((emotion) => (
                <Badge key={emotion.id} size="xs" variant="light" color="gray" radius="sm">
                  {emotion.label}
                  {emotion.intensityBefore != null ? ` · ${emotion.intensityBefore}` : ''}
                </Badge>
              ))}
              {summary.emotions.length > 4 && (
                <Text size="xs" c="dimmed">
                  +{summary.emotions.length - 4}
                </Text>
              )}
            </Group>
          )}
        </Stack>

        <Menu position="bottom-end" withinPortal shadow="md">
          <Menu.Target>
            <ActionIcon variant="subtle" color="gray" aria-label="Aktionen für dieses Protokoll">
              <IconDots size={18} />
            </ActionIcon>
          </Menu.Target>
          <Menu.Dropdown>
            <Menu.Item leftSection={<IconPencil size={16} />} onClick={() => onOpen(record)}>
              Öffnen
            </Menu.Item>
            <Menu.Divider />
            <Menu.Item
              color="red"
              leftSection={<IconTrash size={16} />}
              onClick={() => onDelete(record)}
            >
              Löschen
            </Menu.Item>
          </Menu.Dropdown>
        </Menu>
      </Group>
    </Card>
  );
}
