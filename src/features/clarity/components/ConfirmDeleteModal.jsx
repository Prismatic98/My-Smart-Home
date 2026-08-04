import { Button, Group, Modal, Stack, Text } from '@mantine/core';

/**
 * Rückfrage vor dem Löschen.
 *
 * Sie ist hier nicht Höflichkeit, sondern notwendig: ein gelöschter Datensatz
 * verliert seinen Inhalt sofort (siehe deleteRecord in clarityRepository.js).
 * Es gibt keinen Papierkorb und kein Zurückholen – das ist der Preis dafür,
 * dass gelöschte Einträge nicht monatelang weiterliegen.
 */
export default function ConfirmDeleteModal({ opened, title, description, onClose, onConfirm }) {
  return (
    <Modal opened={opened} onClose={onClose} title={title} centered>
      <Stack gap="md">
        <Text size="sm">{description}</Text>
        <Text size="sm" c="dimmed">
          Der Inhalt wird dabei sofort verworfen — auch auf dem Pi. Zurückholen
          lässt er sich nicht.
        </Text>

        <Group justify="flex-end" gap="sm">
          <Button variant="default" onClick={onClose}>
            Behalten
          </Button>
          <Button color="red" onClick={onConfirm}>
            Löschen
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
