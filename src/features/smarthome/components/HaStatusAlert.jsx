import { Alert, Button, Group, Loader, Text } from '@mantine/core';
import { IconAlertTriangle, IconPlugConnectedX, IconSettings } from '@tabler/icons-react';

/**
 * Zeigt den Verbindungszustand zu Home Assistant an – nur dann, wenn es
 * etwas zu melden gibt (also nicht im Normalfall 'connected').
 */
export default function HaStatusAlert({ status, error, onReconnect }) {
  if (status === 'connected') return null;

  if (status === 'connecting') {
    return (
      <Alert variant="light" color="blue" mb="md" icon={<Loader size={18} />}>
        Verbinde mit Home Assistant…
      </Alert>
    );
  }

  if (status === 'unconfigured') {
    return (
      <Alert
        variant="light"
        color="yellow"
        mb="md"
        icon={<IconSettings size={18} />}
        title="Home Assistant ist nicht konfiguriert"
      >
        <Text size="sm">{error}</Text>
      </Alert>
    );
  }

  if (status === 'disconnected') {
    return (
      <Alert variant="light" color="orange" mb="md" icon={<IconPlugConnectedX size={18} />}>
        Verbindung unterbrochen – es wird automatisch neu verbunden.
      </Alert>
    );
  }

  return (
    <Alert
      variant="light"
      color="red"
      mb="md"
      icon={<IconAlertTriangle size={18} />}
      title="Keine Verbindung zu Home Assistant"
    >
      <Group justify="space-between" align="flex-end" wrap="wrap" gap="sm">
        <Text size="sm" style={{ flex: 1, minWidth: 220 }}>
          {error}
        </Text>
        <Button size="xs" variant="light" color="red" onClick={onReconnect}>
          Erneut versuchen
        </Button>
      </Group>
    </Alert>
  );
}
