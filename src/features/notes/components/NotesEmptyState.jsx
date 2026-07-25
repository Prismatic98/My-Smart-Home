import { Button, Card, Stack, Text, ThemeIcon } from '@mantine/core';
import { IconNotes, IconPlus } from '@tabler/icons-react';

export default function NotesEmptyState({ onCreate }) {
  return (
    <Card withBorder radius="md" padding="xl">
      <Stack align="center" gap="sm">
        <ThemeIcon variant="light" color="yellow" size={56} radius="md">
          <IconNotes size={28} />
        </ThemeIcon>
        <Text fw={600}>Noch keine Notizen</Text>
        <Text size="sm" c="dimmed" ta="center" maw={420}>
          Notizen werden lokal im Browser gespeichert und stehen dir auch offline zur
          Verfügung.
        </Text>
        <Button mt="xs" leftSection={<IconPlus size={16} />} onClick={onCreate}>
          Erste Notiz anlegen
        </Button>
      </Stack>
    </Card>
  );
}
