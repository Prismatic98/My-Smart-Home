import { ActionIcon, Collapse, Group, Paper, Progress, ScrollArea, Text, Tooltip } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
  IconAlertTriangle,
  IconCheck,
  IconChevronDown,
  IconChevronUp,
  IconX,
} from '@tabler/icons-react';

import { formatBytes, formatDuration } from '../lib/formatBytes.js';
import classes from '../Files.module.scss';

/**
 * Fortschritt der laufenden Uploads, fest unten rechts.
 *
 * Bleibt beim Ordnerwechsel stehen, weil die Warteschlange über der
 * Ordneransicht liegt. Geschlossen wird es nur von Hand – ein Panel, das sich
 * nach dem letzten Upload selbst schließt, nimmt einem die Möglichkeit,
 * Fehler überhaupt zu lesen.
 */
export default function UploadPanel({ items, activeCount, overallPercent, onCancel, onRemove, onClose }) {
  const [opened, { toggle }] = useDisclosure(true);

  if (items.length === 0) return null;

  const finished = items.filter((item) => item.status !== 'queued' && item.status !== 'uploading');
  const failed = items.filter((item) => item.status === 'error');

  const title =
    activeCount > 0
      ? `${activeCount} von ${items.length} wird hochgeladen`
      : failed.length > 0
        ? `${finished.length} abgeschlossen, ${failed.length} fehlgeschlagen`
        : `${finished.length} abgeschlossen`;

  return (
    <Paper withBorder radius="md" shadow="md" className={classes.uploadPanel}>
      <Group justify="space-between" wrap="nowrap" gap="xs" px="sm" py={8}>
        <Text size="sm" fw={600} lineClamp={1}>
          {title}
        </Text>
        <Group gap={2} wrap="nowrap">
          <ActionIcon variant="subtle" color="gray" size="sm" onClick={toggle} aria-label="Panel ein-/ausklappen">
            {opened ? <IconChevronDown size={16} /> : <IconChevronUp size={16} />}
          </ActionIcon>
          <ActionIcon variant="subtle" color="gray" size="sm" onClick={onClose} aria-label="Panel schließen">
            <IconX size={16} />
          </ActionIcon>
        </Group>
      </Group>

      {activeCount > 0 && <Progress value={overallPercent} size="xs" radius={0} />}

      <Collapse in={opened}>
        <ScrollArea.Autosize mah={260} type="auto">
          <div className={classes.uploadList}>
            {items.map((item) => (
              <UploadRow key={item.id} item={item} onCancel={onCancel} onRemove={onRemove} />
            ))}
          </div>
        </ScrollArea.Autosize>
      </Collapse>
    </Paper>
  );
}

function UploadRow({ item, onCancel, onRemove }) {
  const running = item.status === 'uploading';
  const queued = item.status === 'queued';

  return (
    <div className={classes.uploadRow}>
      <Group justify="space-between" wrap="nowrap" gap="xs">
        <Text size="xs" fw={500} lineClamp={1} title={item.name}>
          {item.finalName && item.finalName !== item.name ? item.finalName : item.name}
        </Text>

        <Group gap={4} wrap="nowrap">
          <StatusIcon status={item.status} />
          {running || queued ? (
            <Tooltip label="Abbrechen" withArrow>
              <ActionIcon variant="subtle" color="gray" size="xs" onClick={() => onCancel(item.id)}>
                <IconX size={13} />
              </ActionIcon>
            </Tooltip>
          ) : (
            <ActionIcon
              variant="subtle"
              color="gray"
              size="xs"
              onClick={() => onRemove(item.id)}
              aria-label="Aus der Liste entfernen"
            >
              <IconX size={13} />
            </ActionIcon>
          )}
        </Group>
      </Group>

      {running && <Progress value={item.percent} size="xs" mt={4} />}

      <Text size="xs" c={item.status === 'error' ? 'red' : 'dimmed'} mt={2} lineClamp={2}>
        {describe(item)}
      </Text>
    </div>
  );
}

function StatusIcon({ status }) {
  if (status === 'done') return <IconCheck size={14} color="var(--mantine-color-teal-5)" />;
  if (status === 'error') return <IconAlertTriangle size={14} color="var(--mantine-color-red-5)" />;
  return null;
}

function describe(item) {
  switch (item.status) {
    case 'queued':
      return 'wartet…';
    case 'uploading': {
      const eta = formatDuration(item.etaSeconds);
      const rate = item.bytesPerSecond ? `${formatBytes(item.bytesPerSecond)}/s` : null;
      const parts = [
        `${formatBytes(item.loaded)} von ${formatBytes(item.size)}`,
        rate,
        eta ? `noch ${eta}` : null,
      ].filter(Boolean);
      return parts.join(' · ');
    }
    case 'done':
      return item.finalName && item.finalName !== item.name
        ? `Fertig – wegen Namensgleichheit als „${item.finalName}" gespeichert`
        : `Fertig · ${formatBytes(item.size)}`;
    case 'canceled':
      return 'Abgebrochen';
    case 'error':
      return item.error ?? 'Fehlgeschlagen';
    default:
      return '';
  }
}
