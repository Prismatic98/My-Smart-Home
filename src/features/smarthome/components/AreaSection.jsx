import { useState } from 'react';
import { Button, Group, SimpleGrid, Stack, Text } from '@mantine/core';
import { IconBulb, IconBulbOff } from '@tabler/icons-react';

import { isOn, isUnavailable } from '../capabilities.js';
import { useSmartHomeServices } from '../services.js';
import DeviceCard from './DeviceCard.jsx';
import classes from '../SmartHome.module.scss';

/**
 * Ein Bereich mit seinen Geräten.
 *
 * Bereiche kommen aus der Area-Registry von Home Assistant – dort werden Räume
 * verwaltet, nicht in dieser App. Geräte ohne Bereich landen in einer Gruppe
 * „Ohne Bereich" am Ende der Seite.
 *
 * „Alle an/aus" schaltet nur die Lichter dieses Bereichs, und zwar sequenziell:
 * fünf gleichzeitige Aufrufe an dieselbe Hersteller-Cloud gehen zuverlässig
 * schief (siehe services.js).
 */
export default function AreaSection({ group }) {
  const { setPowerForAll } = useSmartHomeServices();
  const [busy, setBusy] = useState(false);

  const lights = group.devices
    .map((device) => device.primary)
    .filter((entity) => entity && !isUnavailable(entity));

  const anyOn = lights.some(isOn);

  async function switchAll(on) {
    setBusy(true);
    await setPowerForAll(lights, on);
    setBusy(false);
  }

  return (
    <Stack gap="sm">
      <Group justify="space-between" wrap="nowrap" className={classes.areaHeader}>
        <Group gap="xs" wrap="nowrap" style={{ minWidth: 0 }}>
          <Text fw={700} size="lg" lineClamp={1}>
            {group.areaName ?? 'Ohne Bereich'}
          </Text>
          <Text size="sm" c="dimmed">
            {group.devices.length}
          </Text>
        </Group>

        {lights.length > 0 && (
          <Group gap={6} wrap="nowrap">
            <Button
              size="compact-sm"
              variant="light"
              loading={busy}
              disabled={busy}
              leftSection={<IconBulb size={14} />}
              onClick={() => switchAll(true)}
            >
              Alle an
            </Button>
            <Button
              size="compact-sm"
              variant="light"
              color="gray"
              loading={busy}
              disabled={busy || !anyOn}
              leftSection={<IconBulbOff size={14} />}
              onClick={() => switchAll(false)}
            >
              Alle aus
            </Button>
          </Group>
        )}
      </Group>

      <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
        {group.devices.map((device) => (
          <DeviceCard key={device.id} device={device} />
        ))}
      </SimpleGrid>
    </Stack>
  );
}
