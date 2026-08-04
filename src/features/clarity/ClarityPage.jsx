import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Alert,
  Anchor,
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
import { isEmptyThoughtRecord } from './lib/thoughtRecord.js';
import { createRecord, deleteRecord, listRecords, useRecords } from './useClarity.js';
import { useClaritySync } from './useClaritySync.js';
import classes from './Clarity.module.scss';

/**
 * Startseite des Moduls: die Gedankenprotokolle.
 *
 * Getrennt wird nur nach angefangen und abgeschlossen, und auch das ohne
 * Zahlen daneben. Es gibt keine Sortierung nach Werten, keine Auswertung über
 * die Zeit und keinen Hinweis auf Tage ohne Eintrag.
 */
export default function ClarityPage() {
  const navigate = useNavigate();
  const sync = useClaritySync();
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
    navigate(`/clarity/thoughts/${record.id}`);
  }

  async function startNew() {
    setError(null);
    try {
      const record = await createRecord('thoughtRecords', { situationAt: Date.now() });
      navigate(`/clarity/thoughts/${record.id}`);
    } catch (cause) {
      setError(`Das Protokoll konnte nicht angelegt werden: ${cause.message}`);
    }
  }

  function askDelete(record) {
    setDeletion({ open: true, record });
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
      <Group justify="space-between" align="flex-start" wrap="nowrap" mb="lg">
        <div className={classes.intro}>
          <Title order={1} className={classes.title}>
            Klarblick
          </Title>
          <Text size="sm" c="dimmed" mt={6}>
            {HELP_TEXTS.intro}
          </Text>
        </div>
        <SyncStatus
          status={sync.status}
          lastSyncedAt={sync.lastSyncedAt}
          error={sync.error}
          onRetry={sync.sync}
        />
      </Group>

      <Alert
        color="yellow"
        variant="light"
        icon={<IconAlertTriangle size={18} />}
        mb="lg"
        classNames={{ message: classes.alertMessage }}
      >
        Noch ohne Zugangskontrolle: wer im Tailnet die Adresse erreicht, sieht
        alles. Bis der Login da ist, gehören hier nur Testdaten hinein.
      </Alert>

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

      <Group gap="xs" mb="xl" wrap="wrap">
        <Anchor component={Link} to="/clarity/denkfehler" size="sm">
          Denkfehler nachschlagen
        </Anchor>
        <Text size="sm" c="dimmed">
          ·
        </Text>
        <Anchor component={Link} to="/clarity/debug" size="sm" c="dimmed">
          Datenschicht
        </Anchor>
      </Group>

      {isLoading ? (
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
          {[0, 1, 2].map((index) => (
            <Skeleton key={index} height={140} radius="md" />
          ))}
        </SimpleGrid>
      ) : records.length === 0 ? (
        <EmptyState onQuick={() => setQuickOpen(true)} onNew={startNew} />
      ) : (
        <Stack gap="lg">
          {drafts.length > 0 && (
            <Section label="Angefangen" records={drafts} onOpen={openRecord} onDelete={askDelete} />
          )}
          {done.length > 0 && (
            <Section label="Abgeschlossen" records={done} onOpen={openRecord} onDelete={askDelete} />
          )}
        </Stack>
      )}

      <QuickCaptureModal
        opened={quickOpen}
        onClose={() => setQuickOpen(false)}
        onCreated={(record, continueEditing) => {
          setQuickOpen(false);
          if (continueEditing) navigate(`/clarity/thoughts/${record.id}?schritt=2`);
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
            color: 'grape',
            onClick: () => setQuickOpen(true),
          },
          {
            key: 'new',
            label: 'Neues Protokoll',
            icon: IconNotebook,
            color: 'blue',
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
      <Text size="xs" fw={700} c="dimmed" tt="uppercase" mb="xs" className={classes.sectionLabel}>
        {label}
      </Text>
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
        {records.map((record) => (
          <ThoughtRecordCard
            key={record.id}
            record={record}
            onOpen={onOpen}
            onDelete={onDelete}
          />
        ))}
      </SimpleGrid>
    </div>
  );
}

/**
 * Der leere Zustand nennt beide Wege und erklärt den Unterschied.
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
        <Button leftSection={<IconBolt size={16} />} onClick={onQuick}>
          Schnell festhalten
        </Button>
        <Button variant="light" leftSection={<IconNotebook size={16} />} onClick={onNew}>
          Neues Protokoll
        </Button>
      </Group>
    </Stack>
  );
}
