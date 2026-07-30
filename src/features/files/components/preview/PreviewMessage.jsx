import { Center, Stack, Text, ThemeIcon } from '@mantine/core';

/**
 * Ersatz für eine Vorschau: keine möglich, noch nicht geladen, fehlgeschlagen.
 *
 * Wichtig ist, dass hier immer ein Grund steht. „Keine Vorschau verfügbar" ohne
 * Erklärung liest sich wie ein Fehler, obwohl es bei einem ZIP-Archiv die
 * richtige Antwort ist.
 */
export default function PreviewMessage({ icon: Icon, color = 'gray', title, children }) {
  return (
    <Center h="100%" p="xl">
      <Stack align="center" gap="xs" maw={420}>
        {Icon && (
          <ThemeIcon variant="light" color={color} size={56} radius="xl">
            <Icon size={28} />
          </ThemeIcon>
        )}
        <Text fw={600} ta="center">
          {title}
        </Text>
        {children}
      </Stack>
    </Center>
  );
}
