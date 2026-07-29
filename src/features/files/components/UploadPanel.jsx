import { useEffect } from 'react';
import { ActionIcon, Button, Collapse, Group, Paper, Progress, Text } from '@mantine/core';
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
 * Fortschritt der laufenden Uploads, fest unten rechts über dem Aktionsknopf.
 *
 * Bleibt beim Ordnerwechsel stehen, weil die Warteschlange über der
 * Ordneransicht liegt.
 *
 * Die Liste steckt bewusst in einem einfachen scrollbaren <div> und nicht in
 * einer ScrollArea: deren absolut positionierter Viewport lässt sich von
 * Collapse nicht ausmessen, das Ausklappen tat dann schlicht nichts.
 */

/** Nach erfolgreichem Abschluss schließt sich das Panel von selbst. */
const AUTO_HIDE_MS = 4_000;

export default function UploadPanel({
  items,
  activeCount,
  overallPercent,
  onCancel,
  onCancelAll,
  onRemove,
  onClose,
}) {
  const [opened, { toggle }] = useDisclosure(true);

  const failed = items.filter((item) => item.status === 'error');
  const canceled = items.filter((item) => item.status === 'canceled');
  const finished = items.filter((item) => item.status !== 'queued' && item.status !== 'uploading');

  // Lief alles glatt, muss man das Panel nicht auch noch wegklicken.
  // Bei Fehlern oder Abbrüchen bleibt es stehen – das will man lesen.
  const canAutoHide =
    items.length > 0 && activeCount === 0 && failed.length === 0 && canceled.length === 0;

  useEffect(() => {
    if (!canAutoHide) return undefined;
    const timer = setTimeout(onClose, AUTO_HIDE_MS);
    return () => clearTimeout(timer);
  }, [canAutoHide, onClose]);

  if (items.length === 0) return null;

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
          {activeCount > 0 && (
            <Button size="compact-xs" variant="subtle" color="red" onClick={onCancelAll}>
              Alle abbrechen
            </Button>
          )}
          <ActionIcon
            variant="subtle"
            color="gray"
            size="sm"
            onClick={toggle}
            aria-label={opened ? 'Liste einklappen' : 'Liste ausklappen'}
          >
            {opened ? <IconChevronDown size={16} /> : <IconChevronUp size={16} />}
          </ActionIcon>
          <ActionIcon
            variant="subtle"
            color="gray"
            size="sm"
            onClick={onClose}
            aria-label="Panel schließen"
          >
            <IconX size={16} />
          </ActionIcon>
        </Group>
      </Group>

      {activeCount > 0 && <Progress value={overallPercent} size="xs" radius={0} />}

      <Collapse in={opened}>
        <div className={classes.uploadList}>
          {items.map((item) => (
            <UploadRow key={item.id} item={item} onCancel={onCancel} onRemove={onRemove} />
          ))}
        </div>
      </Collapse>
    </Paper>
  );
}

function UploadRow({ item, onCancel, onRemove }) {
  const stoppable = item.status === 'uploading' || item.status === 'queued';

  return (
    <div className={classes.uploadRow}>
      <Group justify="space-between" wrap="nowrap" gap="xs">
        <Group gap={6} wrap="nowrap" style={{ minWidth: 0 }}>
          <StatusIcon status={item.status} />
          <Text size="xs" fw={500} lineClamp={1} title={item.name}>
            {item.finalName && item.finalName !== item.name ? item.finalName : item.name}
          </Text>
        </Group>

        {stoppable ? (
          <Button
            size="compact-xs"
            variant="light"
            color="red"
            onClick={() => onCancel(item.id)}
            className={classes.cancelButton}
          >
            Abbrechen
          </Button>
        ) : (
          <ActionIcon
            variant="subtle"
            color="gray"
            size="sm"
            onClick={() => onRemove(item.id)}
            aria-label="Aus der Liste entfernen"
          >
            <IconX size={14} />
          </ActionIcon>
        )}
      </Group>

      {item.status === 'uploading' && <Progress value={item.percent} size="xs" mt={4} />}

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
      return [
        `${formatBytes(item.loaded)} von ${formatBytes(item.size)}`,
        rate,
        eta ? `noch ${eta}` : null,
      ]
        .filter(Boolean)
        .join(' · ');
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
