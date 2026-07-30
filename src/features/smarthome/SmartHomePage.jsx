import {
  Alert,
  Badge,
  Card,
  Container,
  Group,
  SimpleGrid,
  Skeleton,
  Stack,
  Text,
} from '@mantine/core';
import { IconBulbOff, IconLock } from '@tabler/icons-react';

import { useHomeAssistant } from '../../lib/HAProvider.jsx';
import AreaSection from './components/AreaSection.jsx';
import HaStatusAlert from './components/HaStatusAlert.jsx';
import RateLimitHint from './components/RateLimitHint.jsx';
import { useDevicesByArea } from './useDevices.js';

/**
 * Übersicht aller Geräte, gruppiert nach Bereich.
 *
 * Gezeigt wird das Geräte-Modell (deviceModel.js), nicht die Entitätenliste:
 * Home Assistant meldet über 60 Lichtentitäten, weil jedes LED-Segment eine
 * eigene ist. Nach Gerät gruppiert sind es acht Karten.
 */
export default function SmartHomePage() {
  const { status, error, reconnect, devices, registryError } = useHomeAssistant();
  const groups = useDevicesByArea();

  const usable = status === 'connected' || status === 'disconnected';
  // Die Registries kommen als eigener Aufruf nach dem Verbindungsaufbau. Bis
  // sie da sind, gibt es zwar Zustände, aber noch keine Gruppierung – das ist
  // Laden, nicht „keine Geräte".
  const loading = status === 'connecting' || (usable && devices.size === 0 && !registryError);

  return (
    <Container size="lg" px={0}>
      <Group justify="flex-end" mb="sm" gap="xs">
        <RateLimitHint />
        <Badge
          variant="dot"
          color={status === 'connected' ? 'teal' : 'gray'}
          title="Zustand der WebSocket-Verbindung zu Home Assistant"
        >
          {status === 'connected' ? 'live' : 'nicht live'}
        </Badge>
      </Group>

      <HaStatusAlert status={status} error={error} onReconnect={reconnect} />

      {registryError && (
        <Alert
          variant="light"
          color="orange"
          mb="md"
          icon={<IconLock size={18} />}
          title="Geräteliste nicht abrufbar"
        >
          <Text size="sm">
            Die Verbindung steht, aber Home Assistant liefert die Geräte- und Bereichsliste
            nicht aus. Das gelingt nur mit einem Token eines Administrator-Kontos – ohne die
            Listen lassen sich Entitäten keinem Gerät zuordnen. Meldung: {registryError}
          </Text>
        </Alert>
      )}

      {loading && (
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
          {[0, 1, 2].map((index) => (
            <Skeleton key={index} height={180} radius="md" />
          ))}
        </SimpleGrid>
      )}

      {!loading && usable && groups.length === 0 && !registryError && (
        <Card withBorder radius="md" padding="xl">
          <Stack align="center" gap="sm">
            <IconBulbOff size={32} />
            <Text fw={600}>Keine bedienbaren Geräte gefunden</Text>
            <Text size="sm" c="dimmed" ta="center" maw={460}>
              Home Assistant meldet keine Geräte mit Lampen, Schaltern oder Auswahlfeldern.
              Geräte, die ausschließlich Diagnosewerte liefern, werden hier absichtlich nicht
              gezeigt.
            </Text>
          </Stack>
        </Card>
      )}

      {groups.length > 0 && (
        <Stack gap="xl">
          {groups.map((group) => (
            <AreaSection key={group.areaId ?? 'ohne-bereich'} group={group} />
          ))}
        </Stack>
      )}
    </Container>
  );
}
