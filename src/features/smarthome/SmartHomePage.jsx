import { useState } from 'react';
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
import { IconAlertTriangle, IconBulbOff } from '@tabler/icons-react';

import { useEntitiesByDomain, useHomeAssistant } from '../../lib/HAProvider.jsx';
import HaStatusAlert from './components/HaStatusAlert.jsx';
import LightCard from './components/LightCard.jsx';

export default function SmartHomePage() {
  const { status, error, reconnect } = useHomeAssistant();
  const lights = useEntitiesByDomain('light');
  const [actionError, setActionError] = useState(null);

  const connecting = status === 'connecting';
  const usable = status === 'connected' || status === 'disconnected';

  return (
    <Container size="lg" px={0}>
      {/* Bleibt als einziges Kopf-Element: der Verbindungszustand ist echte
          Information, keine Beschreibung. HaStatusAlert meldet sich nur bei
          Problemen, dieser Punkt zeigt auch den Normalfall. */}
      <Group justify="flex-end" mb="sm">
        <Badge
          variant="dot"
          color={status === 'connected' ? 'teal' : 'gray'}
          title="Zustand der WebSocket-Verbindung zu Home Assistant"
        >
          {status === 'connected' ? 'live' : 'nicht live'}
        </Badge>
      </Group>

      <HaStatusAlert status={status} error={error} onReconnect={reconnect} />

      {actionError && (
        <Alert
          variant="light"
          color="red"
          icon={<IconAlertTriangle size={18} />}
          withCloseButton
          onClose={() => setActionError(null)}
          mb="md"
        >
          {actionError}
        </Alert>
      )}

      {connecting && (
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
          {[0, 1, 2].map((index) => (
            <Skeleton key={index} height={180} radius="md" />
          ))}
        </SimpleGrid>
      )}

      {usable && lights.length === 0 && (
        <Card withBorder radius="md" padding="xl">
          <Stack align="center" gap="sm">
            <IconBulbOff size={32} />
            <Text fw={600}>Keine Lampen gefunden</Text>
            <Text size="sm" c="dimmed" ta="center" maw={420}>
              Home Assistant meldet keine Entitäten in der Domain „light“. Prüfe, ob die
              Integrationen dort eingerichtet sind.
            </Text>
          </Stack>
        </Card>
      )}

      {lights.length > 0 && (
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
          {lights.map((entity) => (
            <LightCard key={entity.entity_id} entity={entity} onError={setActionError} />
          ))}
        </SimpleGrid>
      )}
    </Container>
  );
}
