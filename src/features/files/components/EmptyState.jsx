import { Button, Center, Stack, Text, ThemeIcon } from '@mantine/core';
import { IconCloudUpload, IconSearchOff } from '@tabler/icons-react';

/**
 * Zwei Leerzustände: der Ordner ist wirklich leer, oder die Suche hat nichts
 * gefunden. Das auseinanderzuhalten erspart die Ratlosigkeit, warum ein
 * eben noch gefüllter Ordner plötzlich leer aussieht.
 */
export default function EmptyState({ variant = 'empty', query, onUpload, onClearSearch }) {
  if (variant === 'search') {
    return (
      <Center mih={220}>
        <Stack align="center" gap="xs">
          <ThemeIcon size={52} radius="xl" variant="light" color="gray">
            <IconSearchOff size={26} />
          </ThemeIcon>
          <Text fw={600}>Nichts gefunden</Text>
          <Text size="sm" c="dimmed" ta="center" maw={360}>
            In diesem Ordner passt nichts zu „{query}".
          </Text>
          <Button variant="subtle" size="sm" onClick={onClearSearch}>
            Suche zurücksetzen
          </Button>
        </Stack>
      </Center>
    );
  }

  return (
    <Center mih={220}>
      <Stack align="center" gap="xs">
        <ThemeIcon size={52} radius="xl" variant="light" color="teal">
          <IconCloudUpload size={26} />
        </ThemeIcon>
        <Text fw={600}>Dieser Ordner ist leer</Text>
        <Text size="sm" c="dimmed" ta="center" maw={380}>
          Dateien hierher ziehen oder über den Knopf auswählen – sie landen auf der SSD des Pi.
        </Text>
        <Button variant="light" size="sm" leftSection={<IconCloudUpload size={16} />} onClick={onUpload}>
          Dateien auswählen
        </Button>
      </Stack>
    </Center>
  );
}
