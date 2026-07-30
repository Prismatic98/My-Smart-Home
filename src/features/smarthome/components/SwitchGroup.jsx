import { Group, Paper, Stack, Switch, Text } from '@mantine/core';

import { isOn, isUnavailable } from '../capabilities.js';
import { shortLabel } from '../deviceModel.js';
import { useOptimisticValue } from '../useOptimisticValue.js';
import { useSmartHomeServices } from '../services.js';
import UnavailableBadge from './UnavailableBadge.jsx';

/**
 * Eine Gruppe von switch-Entitäten – bei den vorhandenen Geräten sind das
 * Lichtzonen (Main/Background/Side/Bottom Light) und DreamView.
 *
 * Die Komponente weiß nicht, was die Schalter bedeuten, und soll es auch nicht
 * wissen: sie rendert jeden Switch des Geräts mit dem Namen, den Home Assistant
 * liefert. Eine Übersetzungstabelle für „Main Light" wäre eine Annahme über den
 * Hersteller und würde beim nächsten Gerät nicht greifen.
 */
export default function SwitchGroup({ device, entities, title }) {
  if (!entities || entities.length === 0) return null;

  return (
    <Stack gap="xs">
      {title && (
        <Text fw={600} size="sm">
          {title}
        </Text>
      )}
      <Stack gap={6}>
        {entities.map((entity) => (
          <SwitchRow key={entity.entity_id} entity={entity} deviceName={device.name} />
        ))}
      </Stack>
    </Stack>
  );
}

export function SwitchRow({ entity, deviceName }) {
  const { setSwitch } = useSmartHomeServices();
  const [on, setOn] = useOptimisticValue(isOn(entity));
  const unavailable = isUnavailable(entity);

  async function handleChange(next) {
    setOn(next);
    const ok = await setSwitch(entity, next);
    if (!ok) setOn(null);
  }

  return (
    <Paper withBorder radius="sm" px="sm" py={8}>
      <Group justify="space-between" wrap="nowrap" gap="sm">
        <Text size="sm" lineClamp={1} style={{ minWidth: 0, flex: 1 }}>
          {shortLabel(entity, deviceName)}
        </Text>

        {unavailable ? (
          <UnavailableBadge reason="Home Assistant erreicht diesen Schalter nicht. Das Gerät unterstützt die Funktion womöglich nicht." />
        ) : (
          <Switch
            checked={on}
            onChange={(event) => handleChange(event.currentTarget.checked)}
            aria-label={shortLabel(entity, deviceName)}
          />
        )}
      </Group>
    </Paper>
  );
}
