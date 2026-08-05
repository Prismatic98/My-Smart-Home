import { useState } from 'react';
import {
  Accordion,
  ActionIcon,
  Alert,
  Badge,
  Button,
  Card,
  Code,
  Container,
  Group,
  Loader,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconAlertTriangle, IconRefresh, IconTrash } from '@tabler/icons-react';

import { formatDateTime } from '../../lib/formatDate.js';
import { wipeAllPauseData } from './pauseSync.js';
import { SYNC_TABLES } from './model.js';
import { deleteRecord, useRecordCounts, useRecords } from './usePause.js';
import { usePauseSync } from './usePauseSync.js';
import classes from './Pause.module.scss';

/**
 * Prüfseite auf der Datenschicht, erreichbar unter /pause/debug.
 *
 * Sie prüft genau das, was über die Oberfläche nicht prüfbar ist: entsteht
 * ein Datensatz, kommt er auf dem zweiten Gerät an, bleibt ein gelöschter
 * gelöscht, rückt der Wasserstand korrekt vor. Sie ist ausdrücklich KEIN
 * Entwurf der Oberfläche – die steht unter /pause.
 *
 * Der Ton der eigentlichen Oberfläche gilt hier bewusst nicht: „Tabelle",
 * „dirty" und „Wasserstand" stehen hier, weil hier Technik geprüft wird.
 */
export default function PauseDebugPage() {
  const { status, lastSyncedAt, lastResult, error, sync } = usePauseSync();
  const { counts } = useRecordCounts();

  return (
    <Container size="sm" px={0} className={classes.page}>
      <Stack gap="lg">
        <div>
          <Title order={2}>Innehalten — Datenschicht</Title>
          <Text size="sm" c="dimmed">
            Prüfseite — nicht Teil der Oberfläche.
          </Text>
        </div>

        <SyncCard
          status={status}
          lastSyncedAt={lastSyncedAt}
          lastResult={lastResult}
          error={error}
          onSync={sync}
        />

        <CountsCard counts={counts} />
        <RawRecordsCard />
        <DangerCard />
      </Stack>
    </Container>
  );
}

// ---------------------------------------------------------------------------

function SyncCard({ status, lastSyncedAt, lastResult, error, onSync }) {
  return (
    <Card withBorder padding="md" radius="md">
      <Group justify="space-between" align="flex-start" wrap="nowrap">
        <Stack gap={4}>
          <Group gap="xs">
            <Text fw={600}>Abgleich</Text>
            <Badge variant="light" color={statusColor(status)}>
              {status}
            </Badge>
            {status === 'syncing' && <Loader size={14} />}
          </Group>

          <Text size="sm" c="dimmed">
            {lastSyncedAt > 0
              ? `Zuletzt: ${formatDateTime(lastSyncedAt)}`
              : 'Noch nicht synchronisiert'}
          </Text>

          {lastResult && (
            <Text size="xs" c="dimmed">
              gesendet {lastResult.pushed} · vom Server übernommen {lastResult.applied} ·
              übersprungen {lastResult.skipped}
            </Text>
          )}

          {error && (
            <Text size="xs" c="red">
              {error.message}
            </Text>
          )}
        </Stack>

        <Button
          variant="light"
          leftSection={<IconRefresh size={16} />}
          onClick={onSync}
          disabled={status === 'syncing'}
        >
          Jetzt abgleichen
        </Button>
      </Group>
    </Card>
  );
}

function statusColor(status) {
  if (status === 'error') return 'red';
  if (status === 'offline') return 'gray';
  if (status === 'ok') return 'teal';
  return 'blue';
}

// ---------------------------------------------------------------------------

function CountsCard({ counts }) {
  if (!counts) return null;

  return (
    <Card withBorder padding="md" radius="md">
      <Text fw={600} mb="sm">
        Bestand
      </Text>
      <Stack gap="xs">
        {SYNC_TABLES.map((table) => (
          <Group key={table} justify="space-between" wrap="nowrap">
            <Code>{table}</Code>
            <Text size="sm" c="dimmed">
              aktiv {counts[table].active} · gelöscht {counts[table].deleted} · offen{' '}
              {counts[table].dirty}
            </Text>
          </Group>
        ))}
      </Stack>
    </Card>
  );
}

// ---------------------------------------------------------------------------

/** Rohansicht samt Löschknopf – prüft Tombstones und Sync. */
function RawRecordsCard() {
  const { records } = useRecords('thoughtRecords');

  return (
    <Card withBorder padding="md" radius="md">
      <Text fw={600} mb="sm">
        Datensätze
      </Text>

      {records.length === 0 ? (
        <Text size="sm" c="dimmed">
          Keine aktiven Datensätze.
        </Text>
      ) : (
        <Accordion variant="separated">
          {records.map((record) => (
            <Accordion.Item key={record.id} value={record.id}>
              <Accordion.Control>
                <Group justify="space-between" wrap="nowrap" pr="sm">
                  <Text size="sm" truncate>
                    {describe(record)}
                  </Text>
                  {record.dirty === 1 && (
                    <Badge size="xs" variant="light" color="orange">
                      offen
                    </Badge>
                  )}
                </Group>
              </Accordion.Control>
              <Accordion.Panel>
                <Stack gap="xs">
                  <Code block className={classes.raw}>
                    {JSON.stringify(record, null, 2)}
                  </Code>
                  <Group justify="flex-end">
                    <ActionIcon
                      variant="light"
                      color="red"
                      onClick={() => deleteRecord('thoughtRecords', record.id)}
                      aria-label="Löschen"
                    >
                      <IconTrash size={16} />
                    </ActionIcon>
                  </Group>
                </Stack>
              </Accordion.Panel>
            </Accordion.Item>
          ))}
        </Accordion>
      )}
    </Card>
  );
}

/** Eine Zeile Überschrift je Datensatz – reine Anzeige, keine Auswertung. */
function describe(record) {
  const label = record.situation?.trim() || '(ohne Situation)';
  return `${label} · ${formatDateTime(record.updatedAt)}`;
}

// ---------------------------------------------------------------------------

function DangerCard() {
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState('');

  async function wipe() {
    setBusy(true);
    try {
      const { deletedOnServer } = await wipeAllPauseData();
      notifications.show({ message: `Gelöscht. Auf dem Server: ${deletedOnServer} Zeilen.` });
      setConfirm('');
    } catch (cause) {
      notifications.show({ color: 'red', message: cause.message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card withBorder padding="md" radius="md" className={classes.danger}>
      <Text fw={600} mb="xs">
        Alle Innehalten-Daten löschen
      </Text>
      <Text size="sm" c="dimmed" mb="md">
        Löscht endgültig — auf dem Pi und auf diesem Gerät, ohne Tombstone und
        ohne Wiederherstellung. Andere Geräte behalten ihren Bestand, bis dort
        dasselbe ausgelöst wird.
      </Text>

      <Alert color="gray" variant="light" icon={<IconAlertTriangle size={16} />} mb="md">
        Das ist auch der Weg, die Zeilen der zurückgebauten Arbeitsblätter vom
        Pi zu bekommen: der Server kennt die Datenarten nur als Zeichenkette und
        räumt sie nicht von selbst weg.
      </Alert>

      <Group align="flex-end" gap="sm" wrap="wrap">
        <TextInput
          label="Zum Bestätigen LÖSCHEN eingeben"
          value={confirm}
          onChange={(event) => setConfirm(event.currentTarget.value)}
          style={{ flex: '1 1 220px' }}
        />
        <Button color="red" disabled={busy || confirm !== 'LÖSCHEN'} onClick={wipe}>
          Endgültig löschen
        </Button>
      </Group>
    </Card>
  );
}
