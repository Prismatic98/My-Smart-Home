import { Alert, Button, Group, List, Modal, Stack, Text } from '@mantine/core';
import { IconAlertTriangle } from '@tabler/icons-react';

/** Bis hierhin werden die Namen einzeln aufgezählt, danach nur noch gezählt. */
const NAME_LIMIT = 8;

/**
 * Bestätigung vor dem Löschen – für einen Eintrag wie für eine Auswahl.
 * Ordner verschwinden samt Inhalt, deshalb steht das ausdrücklich dabei.
 */
export default function DeleteConfirmModal({ opened, entries = [], onClose, onConfirm, pending, error }) {
  const single = entries.length === 1 ? entries[0] : null;
  const folders = entries.filter((entry) => entry.type === 'dir').length;

  return (
    <Modal opened={opened} onClose={onClose} title="Löschen" radius="md" centered size="sm">
      <Stack gap="md">
        {error && (
          <Alert color="red" variant="light" icon={<IconAlertTriangle size={18} />}>
            {error.message}
          </Alert>
        )}

        <Text size="sm">
          {single ? (
            <>
              Soll <strong>{single.name}</strong> wirklich gelöscht werden?
            </>
          ) : (
            <>
              Sollen wirklich <strong>{entries.length} Einträge</strong> gelöscht werden?
            </>
          )}
        </Text>

        {!single && entries.length <= NAME_LIMIT && (
          <List size="sm" spacing={2} c="dimmed">
            {entries.map((entry) => (
              <List.Item key={entry.name}>{entry.name}</List.Item>
            ))}
          </List>
        )}

        {folders > 0 && (
          <Text size="sm" c="dimmed">
            {folders === 1
              ? 'Der Ordner wird mit seinem gesamten Inhalt gelöscht.'
              : `${folders} Ordner werden mit ihrem gesamten Inhalt gelöscht.`}{' '}
            Das lässt sich nicht rückgängig machen.
          </Text>
        )}

        <Group justify="flex-end" gap="sm">
          <Button variant="default" onClick={onClose} disabled={pending}>
            Abbrechen
          </Button>
          <Button color="red" onClick={onConfirm} loading={pending}>
            Löschen
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
