import { useEffect } from 'react';
import { ActionIcon, Button, Group, Paper, Progress, Text } from '@mantine/core';
import { IconAlertTriangle, IconCheck, IconX } from '@tabler/icons-react';

import { formatBytes, formatDuration } from '../lib/formatBytes.js';
import classes from '../Files.module.scss';

/**
 * Fortschritt der laufenden Uploads, fest unten rechts über dem Aktionsknopf.
 *
 * Bleibt beim Ordnerwechsel stehen, weil die Warteschlange über der
 * Ordneransicht liegt.
 *
 * Bewusst ohne Ein-/Ausklappen und ohne Schließen-Kreuz während des Uploads:
 * beides hatte in dieser Phase nichts zu tun (es gibt noch nichts wegzuräumen)
 * und wirkte deshalb kaputt. Geschlossen wird erst, wenn etwas fertig ist –
 * bei reinem Erfolg sogar von allein.
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
  const failed = items.filter((item) => item.status === 'error');
  const canceled = items.filter((item) => item.status === 'canceled');
  const finished = items.filter((item) => item.status !== 'queued' && item.status !== 'uploading');
  const uploading = activeCount > 0;

  // Lief alles glatt, muss man das Panel nicht auch noch wegklicken.
  // Bei Fehlern oder Abbrüchen bleibt es stehen – das will man lesen.
  const canAutoHide =
    items.length > 0 && !uploading && failed.length === 0 && canceled.length === 0;

  useEffect(() => {
    if (!canAutoHide) return undefined;
    const timer = setTimeout(onClose, AUTO_HIDE_MS);
    return () => clearTimeout(timer);
  }, [canAutoHide, onClose]);

  if (items.length === 0) return null;

  return (
    <Paper
      withBorder
      radius="md"
      shadow="lg"
      className={classes.uploadPanel}
      data-uploading={uploading || undefined}
    >
      <div className={classes.uploadHeader}>
        <Group justify="space-between" wrap="nowrap" gap="sm" align="flex-start">
          <div style={{ minWidth: 0 }}>
            <Text fw={650}>
              {uploading
                ? `Lädt hoch – ${items.length - finished.length} von ${items.length}`
                : failed.length > 0
                  ? `${finished.length} abgeschlossen, ${failed.length} fehlgeschlagen`
                  : `${finished.length} abgeschlossen`}
            </Text>
            {uploading && (
              <Text size="xs" c="dimmed">
                {formatBytes(items.reduce((sum, item) => sum + item.loaded, 0))} übertragen
              </Text>
            )}
          </div>

          {uploading ? (
            <Text fw={700} size="xl" c="teal" style={{ lineHeight: 1 }}>
              {overallPercent}%
            </Text>
          ) : (
            <ActionIcon
              variant="subtle"
              color="gray"
              onClick={onClose}
              aria-label="Panel schließen"
            >
              <IconX size={18} />
            </ActionIcon>
          )}
        </Group>

        {uploading && <Progress value={overallPercent} size="md" radius="xl" mt="xs" />}
      </div>

      <div className={classes.uploadList}>
        {items.map((item) => (
          <UploadRow key={item.id} item={item} onCancel={onCancel} onRemove={onRemove} />
        ))}
      </div>

      {uploading && (
        <div className={classes.uploadFooter}>
          <Button fullWidth variant="light" color="red" onClick={onCancelAll}>
            {activeCount === 1 ? 'Upload abbrechen' : `Alle ${activeCount} Uploads abbrechen`}
          </Button>
        </div>
      )}
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
          <Text size="sm" fw={500} lineClamp={1} title={item.name}>
            {item.finalName && item.finalName !== item.name ? item.finalName : item.name}
          </Text>
        </Group>

        {stoppable ? (
          <Button
            size="compact-sm"
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

      {item.status === 'uploading' && <Progress value={item.percent} size="sm" mt={6} />}

      <Text size="xs" c={item.status === 'error' ? 'red' : 'dimmed'} mt={4} lineClamp={2}>
        {describe(item)}
      </Text>
    </div>
  );
}

function StatusIcon({ status }) {
  if (status === 'done') return <IconCheck size={15} color="var(--mantine-color-teal-5)" />;
  if (status === 'error') return <IconAlertTriangle size={15} color="var(--mantine-color-red-5)" />;
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
