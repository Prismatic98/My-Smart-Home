import { Card, Checkbox, Group, SimpleGrid, Text, ThemeIcon } from '@mantine/core';

import { fileIcon } from '../lib/fileIcon.js';
import { formatBytes } from '../lib/formatBytes.js';
import { formatRelativeDateTime } from '../../../lib/formatDate.js';
import FileEntryMenu from './FileEntryMenu.jsx';
import classes from '../Files.module.scss';

/**
 * Kachelansicht.
 *
 * Ein Klick genügt: auf einem Ordner geht es hinein, auf einer Datei öffnet sich
 * die Vorschau. Kein Doppelklick – den gibt es auf dem Handy ohnehin nicht.
 *
 * Markiert wird ausschließlich über die Checkbox. Das war früher der Klick auf
 * die Kachel, aber ein Klick kann nicht beides bedeuten – und „ansehen" ist die
 * Handlung, die man hundertmal häufiger will als „auswählen".
 */
export default function FileGrid({
  entries,
  selected,
  onToggle,
  onActivate,
  onDownload,
  onRename,
  onMove,
  onDelete,
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
            onClick={() => onActivate(entry)}
            tabIndex={0}
            onKeyDown={(event) => {
              if (event.key === 'Enter') onActivate(entry);
            }}
          >
            <Group justify="space-between" wrap="nowrap" mb={4}>
              {/* Größere Trefferfläche als die Checkbox selbst – mit dem Daumen
                  ist ein 16-px-Kästchen nicht zu treffen. */}
              <div
                className={classes.checkboxHit}
                onClick={(event) => event.stopPropagation()}
                role="presentation"
              >
                <Checkbox
                  size="sm"
                  checked={isSelected}
                  aria-label={`${entry.name} auswählen`}
                  onChange={() => onToggle(entry.name)}
                />
              </div>
              <FileEntryMenu
                entry={entry}
                onDownload={onDownload}
                onRename={onRename}
                onMove={onMove}
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
