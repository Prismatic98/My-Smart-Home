import {
  Card,
  Container,
  Group,
  SegmentedControl,
  Stack,
  Text,
  ThemeIcon,
  Title,
  useMantineColorScheme,
} from '@mantine/core';
import { IconSettings } from '@tabler/icons-react';

/**
 * Einstellungen der App.
 *
 * Bislang eine einzige: das Farbschema. Es saß als Umschalter im Header und
 * hat dort einen Platz belegt, den man täglich sieht und höchstens zweimal
 * benutzt – eine Einstellung gehört an einen Ort, den man aufsucht.
 *
 * Als Seite gibt es zudem Raum für die dritte Möglichkeit, die ein Umschalter
 * nicht abbilden kann: dem System zu folgen.
 */
export default function SettingsPage() {
  // `colorScheme` ist die gewählte Vorgabe ('auto' | 'light' | 'dark'), nicht
  // das daraus errechnete Schema – hier ist die Wahl gemeint, nicht das
  // Ergebnis. Deshalb kein `useComputedColorScheme`.
  const { colorScheme, setColorScheme } = useMantineColorScheme();

  return (
    <Container size="sm" px={0}>
      <Group gap="sm" align="center" wrap="nowrap" mb="lg">
        <ThemeIcon size={36} radius="md" variant="light" color="gray">
          <IconSettings size={22} />
        </ThemeIcon>
        <Title order={2}>Einstellungen</Title>
      </Group>

      <Card withBorder radius="md" padding="lg">
        <Stack gap="sm">
          <Text fw={600}>Farbschema</Text>
          <SegmentedControl
            fullWidth
            value={colorScheme}
            onChange={setColorScheme}
            data={[
              { value: 'auto', label: 'System' },
              { value: 'light', label: 'Hell' },
              { value: 'dark', label: 'Dunkel' },
            ]}
          />
          <Text size="xs" c="dimmed">
            {colorScheme === 'auto'
              ? 'Folgt der Einstellung des Geräts.'
              : 'Gilt auf diesem Gerät, unabhängig von seiner Einstellung.'}
          </Text>
        </Stack>
      </Card>
    </Container>
  );
}
