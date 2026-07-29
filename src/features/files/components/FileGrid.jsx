import { Card, Checkbox, Group, SimpleGrid, Text, ThemeIcon } from '@mantine/core';

import { fileIcon } from '../lib/fileIcon.js';
import { formatBytes } from '../lib/formatBytes.js';
import { formatRelativeDateTime } from '../../../lib/formatDate.js';
import FileEntryMenu from './FileEntryMenu.jsx';
import classes from '../Files.module.scss';

/**
 * Kachelansicht.
 *
 * Geöffnet wird per Doppelklick – auf Touch-Geräten per einfachem Tipp, weil
 * es dort keinen Doppelklick gibt (`singleClickOpens`). Markiert wird über die
 * Checkbox, damit sich Öffnen und Auswählen nie in die Quere kommen.
 */
export default function FileGrid({
  entries,
  selected,
  onToggle,
  onOpen,
  onDownload,
  onRename,
  onDelete,
  singleClickOpens,
}) {
  return (
    <SimpleGrid cols={{ base: 2, sm: 3, lg: 4, xl: 5 }} spacing="sm">
      {entries.map((entry) => {
        const { icon: Icon, color } = fileIcon(entry);
        const isSelected = selected.has(entry.name);

        return (
          <Card
            key={entry.name}
            withBorder
            radius="md"
            padding="sm"
            className={`${classes.gridCard} ${isSelected ? classes.gridCardSelected : ''}`}
            onClick={singleClickOpens ? () => onOpen(entry) : undefined}
            onDoubleClick={singleClickOpens ? undefined : () => onOpen(entry)}
            tabIndex={0}
            onKeyDown={(event) => {
              if (event.key === 'Enter') onOpen(entry);
            }}
          >
            <Group justify="space-between" wrap="nowrap" mb={4}>
              <Checkbox
                size="xs"
                checked={isSelected}
                aria-label={`${entry.name} auswählen`}
                onChange={() => onToggle(entry.name)}
                onClick={(event) => event.stopPropagation()}
              />
              <FileEntryMenu
                entry={entry}
                onDownload={onDownload}
                onRename={onRename}
                onDelete={onDelete}
              />
            </Group>

            <ThemeIcon variant="light" color={color} size={44} radius="md" mb="xs">
              <Icon size={24} />
            </ThemeIcon>

            <Text size="sm" fw={550} lineClamp={2} title={entry.name}>
              {entry.name}
            </Text>
            <Text size="xs" c="dimmed" mt={2}>
              {entry.type === 'dir' ? 'Ordner' : formatBytes(entry.size)}
              {' · '}
              {formatRelativeDateTime(new Date(entry.modifiedAt).getTime())}
            </Text>
          </Card>
        );
      })}
    </SimpleGrid>
  );
}
