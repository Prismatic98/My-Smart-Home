import { ActionIcon, Group, Loader, Text, Tooltip } from '@mantine/core';
import { IconAlertTriangle, IconCloudCheck, IconCloudOff, IconRefresh } from '@tabler/icons-react';

import { formatDateTime, formatRelativeDateTime } from '../../lib/formatDate.js';

/**
 * Dezente Anzeige des Sync-Zustands.
 *
 * Bewusst zurückhaltend: die App ist local-first, ein laufender oder
 * ausbleibender Sync ändert nichts an der Bedienbarkeit. Nur im Fehlerfall
 * wird es sichtbarer – und bietet dann einen Knopf zum erneuten Versuch.
 *
 * Steht in src/components und nicht in einem Feature-Ordner, weil inzwischen
 * zwei Module einen eigenen Sync haben (Notizen, Innehalten). Geteilt wird
 * ausschließlich die Anzeige: die Zustände (`useNotesSync`, `usePauseSync`)
 * bleiben getrennt, damit ein Fehler im einen Modul den anderen nicht
 * mitbetrifft.
 */
export default function SyncStatus({ status, lastSyncedAt, error, onRetry }) {
  if (status === 'syncing') {
    return (
      <Line>
        <Loader size={12} />
        Synchronisiere…
      </Line>
    );
  }

  if (status === 'offline') {
    return (
      <Tooltip
        label="Änderungen liegen lokal bereit und gehen raus, sobald wieder Netz da ist."
        withArrow
        multiline
        w={260}
      >
        <div>
          <Line>
            <IconCloudOff size={14} />
            Offline
          </Line>
        </div>
      </Tooltip>
    );
  }

  if (status === 'error') {
    return (
      <Group gap={6} wrap="nowrap">
        <Tooltip label={error?.message ?? 'Unbekannter Fehler'} withArrow multiline w={280}>
          <Text
            size="xs"
            c="red"
            span
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <IconAlertTriangle size={14} />
            Sync fehlgeschlagen
          </Text>
        </Tooltip>
        <ActionIcon
          size="xs"
          variant="subtle"
          color="gray"
          onClick={onRetry}
          aria-label="Sync erneut versuchen"
        >
          <IconRefresh size={14} />
        </ActionIcon>
      </Group>
    );
  }

  if (status === 'ok' && lastSyncedAt > 0) {
    return (
      <Tooltip label={`Zuletzt synchronisiert: ${formatDateTime(lastSyncedAt)}`} withArrow>
        <div>
          <Line>
            <IconCloudCheck size={14} />
            Sync {formatRelativeDateTime(lastSyncedAt)}
          </Line>
        </div>
      </Tooltip>
    );
  }

  return <Line>Noch nicht synchronisiert</Line>;
}

/** Einheitliche, unaufdringliche Zeile. */
function Line({ children }) {
  return (
    <Text size="xs" c="dimmed" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      {children}
    </Text>
  );
}
