import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Button,
  Container,
  Group,
  SimpleGrid,
  Skeleton,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import { IconAlertTriangle, IconBolt, IconNotebook } from '@tabler/icons-react';

import ActionFab from '../../components/ActionFab/ActionFab.jsx';
import SyncStatus from '../../components/SyncStatus/SyncStatus.jsx';
import ConfirmDeleteModal from './components/ConfirmDeleteModal.jsx';
import QuickCaptureModal from './components/QuickCaptureModal.jsx';
import ThoughtRecordCard from './components/ThoughtRecordCard.jsx';
import { HELP_TEXTS } from './content/prompts.js';
import { PAUSE_COLOR } from './lib/appearance.js';
import { isEmptyThoughtRecord } from './lib/thoughtRecord.js';
import { createRecord, deleteRecord, listRecords, useRecords } from './usePause.js';
import { usePauseSync } from './usePauseSync.js';
import classes from './Pause.module.scss';

/**
 * Die Gedankenprotokolle.
 *
 * Getrennt wird nur nach angefangen und abgeschlossen, und auch das ohne
 * Zahlen daneben. Es gibt keine Sortierung nach Werten, keine Auswertung über
 * die Zeit und keinen Hinweis auf Tage ohne Eintrag.
 *
 * Zwei Spalten statt drei: die Kacheln tragen inzwischen den Inhalt eines
 * ganzen Protokolls, drei nebeneinander wären nicht mehr lesbar.
 */
export default function ThoughtRecordsPage() {
  const navigate = useNavigate();
  const sync = usePauseSync();
  const { records, isLoading } = useRecords('thoughtRecords', { index: 'situationAt' });

  const [quickOpen, setQuickOpen] = useState(false);
  const [deletion, setDeletion] = useState({ open: false, record: null });
  const [error, setError] = useState(null);

  /**
   * Leere Entwürfe wegräumen.
   *
   * „Neues Protokoll" legt den Datensatz sofort an, weil der mehrstufige
   * Editor etwas zum Anhängen braucht. Wer ihn gleich wieder verlässt, hätte
   * sonst eine leere Karte in der Liste. Aufgeräumt wird beim Betreten der
   * Übersicht und nicht beim Verlassen des Editors: die Zurück-Taste des
   * Handys läuft an jedem Aufräumen im Editor vorbei, hier landet sie
   * zwangsläufig.
   */
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const all = await listRecords('thoughtRecords');
      for (const record of all) {
        if (cancelled) return;
        if (isEmptyThoughtRecord(record)) await deleteRecord('thoughtRecords', record.id);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  function openRecord(record) {
    navigate(`/pause/thoughts/${record.id}`);
  }

  function askDelete(record) {
    setDeletion({ open: true, record });
  }

  async function startNew() {
    setError(null);
    try {
      const record = await createRecord('thoughtRecords', { situationAt: Date.now() });
      navigate(`/pause/thoughts/${record.id}`);
    } catch (cause) {
      setError(`Das Protokoll konnte nicht angelegt werden: ${cause.message}`);
    }
  }

  async function handleDelete() {
    setError(null);
    try {
      await deleteRecord('thoughtRecords', deletion.record.id);
      setDeletion({ open: false, record: null });
    } catch (cause) {
      setError(`Das Protokoll konnte nicht gelöscht werden: ${cause.message}`);
    }
  }

  const drafts = records.filter((record) => record.status !== 'complete');
  const done = records.filter((record) => record.status === 'complete');

  return (
    <Container size="lg" px={0} pb={96} className={classes.page}>
      {/* Der Abgleich steht oben rechts in der Ecke, genau wie in den Notizen –
          das andere Modul mit eigenem Sync. Er gehört nicht neben die
          Überschrift: dort wandert er mit ihr nach unten und sitzt bei jeder
          Seite woanders. Wo der Stand des Abgleichs steht, soll man nicht
          suchen müssen. */}
      <Group justify="flex-end" align="center" wrap="nowrap" mb="sm">
        <SyncStatus
          status={sync.status}
          lastSyncedAt={sync.lastSyncedAt}
          error={sync.error}
          onRetry={sync.sync}
        />
      </Group>

      <Title order={2} className={classes.title} mb="lg">
        Gedankenprotokoll
      </Title>

      {error && (
        <Alert
          color="red"
          variant="light"
          icon={<IconAlertTriangle size={18} />}
          withCloseButton
          onClose={() => setError(null)}
          mb="md"
        >
          {error}
        </Alert>
      )}

      {isLoading ? (
        <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
          {[0, 1].map((index) => (
            <Skeleton key={index} height={220} radius="md" />
          ))}
        </SimpleGrid>
      ) : records.length === 0 ? (
        <EmptyState onQuick={() => setQuickOpen(true)} onNew={startNew} />
      ) : (
        <Stack gap="xl">
          {drafts.length > 0 && (
            <Section label="Angefangen" records={drafts} onOpen={openRecord} onDelete={askDelete} />
          )}
          {done.length > 0 && (
            <Section
              label="Abgeschlossen"
              records={done}
              onOpen={openRecord}
              onDelete={askDelete}
            />
          )}
        </Stack>
      )}

      <QuickCaptureModal
        opened={quickOpen}
        onClose={() => setQuickOpen(false)}
        onCreated={(record, continueEditing) => {
          setQuickOpen(false);
          if (continueEditing) navigate(`/pause/thoughts/${record.id}?schritt=2`);
        }}
      />

      <ConfirmDeleteModal
        opened={deletion.open}
        title="Protokoll löschen"
        description="Dieses Gedankenprotokoll wird von diesem Gerät und vom Pi entfernt."
        onClose={() => setDeletion((state) => ({ ...state, open: false }))}
        onConfirm={handleDelete}
      />

      <ActionFab
        actions={[
          {
            key: 'quick',
            label: 'Schnell festhalten',
            icon: IconBolt,
            color: PAUSE_COLOR,
            onClick: () => setQuickOpen(true),
          },
          {
            key: 'new',
            label: 'Neues Protokoll',
            icon: IconNotebook,
            color: 'indigo',
            onClick: startNew,
          },
        ]}
      />
    </Container>
  );
}

function Section({ label, records, onOpen, onDelete }) {
  return (
    <div>
      <Text size="xs" fw={700} c="dimmed" tt="uppercase" mb="sm" className={classes.sectionLabel}>
        {label}
      </Text>
      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
        {records.map((record) => (
          <ThoughtRecordCard key={record.id} record={record} onOpen={onOpen} onDelete={onDelete} />
        ))}
      </SimpleGrid>
    </div>
  );
}

/**
 * Der leere Zustand nennt beide Wege und erklärt den Anlass.
 *
 * Kein „Leg endlich los": ein leeres Modul ist kein Versäumnis.
 */
function EmptyState({ onQuick, onNew }) {
  return (
    <Stack gap="sm" align="flex-start" className={classes.empty}>
      <Text fw={600}>Noch kein Gedankenprotokoll</Text>
      <Text size="sm" c="dimmed">
        {HELP_TEXTS.trigger}
      </Text>
      <Group gap="sm" mt="md">
        <Button color={PAUSE_COLOR} leftSection={<IconBolt size={16} />} onClick={onQuick}>
          Schnell festhalten
        </Button>
        <Button variant="light" leftSection={<IconNotebook size={16} />} onClick={onNew}>
          Neues Protokoll
        </Button>
      </Group>
    </Stack>
  );
}
