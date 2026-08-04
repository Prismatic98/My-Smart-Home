import { Group, Slider, Text } from '@mantine/core';

import { isUnavailable } from '../capabilities.js';
import { shortLabel } from '../deviceModel.js';
import { useOptimisticValue } from '../useOptimisticValue.js';
import { useSmartHomeServices } from '../services.js';

/**
 * Regler für eine number-Entität.
 *
 * Grenzen und Schrittweite kommen aus den Attributen der Entität (`min`, `max`,
 * `step`), nicht aus einer Annahme über das Gerät. Gedrosselt wie alle Regler –
 * beim Ziehen höchstens ein Aufruf pro Fenster, beim Loslassen sofort.
 */
export default function NumberControl({ entity, deviceName, disabled = false }) {
  const { setNumber } = useSmartHomeServices();
  const attrs = entity.attributes ?? {};
  const min = attrs.min ?? 0;
  const max = attrs.max ?? 100;
  const step = attrs.step ?? 1;
  const unit = attrs.unit_of_measurement ?? '';

  const live = Number.isFinite(Number(entity.state)) ? Number(entity.state) : min;
  const [value, setValue] = useOptimisticValue(live);
  const unavailable = disabled || isUnavailable(entity);

  function handleChange(next) {
    setValue(next);
    setNumber(entity, next);
  }

  async function handleChangeEnd(next) {
    setValue(next);
    const ok = await setNumber(entity, next, true);
    if (!ok) setValue(null);
  }

  return (
    <div>
      <Group justify="space-between" mb={4} wrap="nowrap">
        <Text size="xs" c="dimmed" lineClamp={1}>
          {shortLabel(entity, deviceName)}
        </Text>
        <Text size="xs" c="dimmed" fw={600}>
          {value}
          {unit && ` ${unit}`}
        </Text>
      </Group>
      <Slider
        value={value}
        onChange={handleChange}
        onChangeEnd={handleChangeEnd}
        disabled={unavailable}
        min={min}
        max={max}
        step={step}
        label={(current) => `${current}${unit ? ` ${unit}` : ''}`}
        aria-label={shortLabel(entity, deviceName)}
      />
    </div>
  );
}
