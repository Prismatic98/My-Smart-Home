import { Button, Card, Group, Stack, Text, ThemeIcon } from '@mantine/core';
import { IconFileText, IconListCheck, IconNotes } from '@tabler/icons-react';

export default function NotesEmptyState({ onCreate, onCreateList }) {
  return (
    <Card withBorder radius="md" padding="xl">
      <Stack align="center" gap="sm">
        <ThemeIcon variant="light" color="yellow" size={56} radius="md">
          <IconNotes size={28} />
        </ThemeIcon>
        <Text fw={600}>Noch nichts angelegt</Text>
        <Text size="sm" c="dimmed" ta="center" maw={420}>
          Textdokumente für alles zum Nachlesen, Listen zum Abhaken. Beides wird lokal im
          Browser gespeichert und steht dir auch offline zur Verfügung.
        </Text>
        <Group gap="sm" mt="xs">
          <Button leftSection={<IconFileText size={16} />} onClick={onCreate}>
            Textdokument
          </Button>
          <Button variant="light" leftSection={<IconListCheck size={16} />} onClick={onCreateList}>
            Liste
          </Button>
        </Group>
      </Stack>
    </Card>
  );
}
