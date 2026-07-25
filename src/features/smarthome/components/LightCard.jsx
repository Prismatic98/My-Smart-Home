import {
  Badge,
  Card,
  ColorInput,
  Group,
  Slider,
  Stack,
  Switch,
  Text,
  ThemeIcon,
} from '@mantine/core';
import { IconBulb, IconBulbOff } from '@tabler/icons-react';

import { entityName, useHomeAssistant } from '../../../lib/HAProvider.jsx';
import {
  brightnessPct,
  colorHex,
  hexToRgb,
  isOn,
  isUnavailable,
  supportsBrightness,
  supportsColor,
} from '../lights.js';
import { useOptimisticValue } from '../useOptimisticValue.js';
import classes from './LightCard.module.scss';

/** Farbvorschläge im Swatch-Bereich des ColorInput. */
const SWATCHES = [
  '#ffffff',
  '#ffd8a8',
  '#ffc078',
  '#ff8787',
  '#f783ac',
  '#b197fc',
  '#74c0fc',
  '#63e6be',
  '#a9e34b',
  '#ffe066',
];

export default function LightCard({ entity, onError }) {
  const { callService } = useHomeAssistant();

  const unavailable = isUnavailable(entity);
  const name = entityName(entity);

  // Angezeigte Werte: live aus der Subscription, kurzzeitig überbrückt
  // vom zuletzt gewünschten Wert (siehe useOptimisticValue).
  const [on, setOn] = useOptimisticValue(isOn(entity));
  const [pct, setPct] = useOptimisticValue(brightnessPct(entity));
  const [hex, setHex] = useOptimisticValue(colorHex(entity) ?? '#ffffff');

  const dimmable = supportsBrightness(entity);
  const colorful = supportsColor(entity);

  /**
   * Service-Aufruf mit Fehlerweitergabe an die Seite. Schlägt er fehl, werden
   * die optimistischen Werte verworfen – sonst bliebe die Karte dauerhaft in
   * einem Zustand stehen, den die Lampe nie eingenommen hat.
   */
  async function call(service, data) {
    try {
      await callService('light', service, { entity_id: entity.entity_id, ...data });
    } catch (cause) {
      setOn(null);
      setPct(null);
      setHex(null);
      onError?.(`${name}: ${cause.message}`);
    }
  }

  function handleToggle(nextOn) {
    setOn(nextOn);
    call(nextOn ? 'turn_on' : 'turn_off');
  }

  function handleBrightness(nextPct) {
    setPct(nextPct);
    if (nextPct === 0) {
      setOn(false);
      call('turn_off');
      return;
    }
    setOn(true);
    call('turn_on', { brightness_pct: nextPct });
  }

  function handleColor(nextHex) {
    const rgb = hexToRgb(nextHex);
    if (!rgb) return;
    setHex(nextHex);
    setOn(true);
    call('turn_on', { rgb_color: rgb });
  }

  return (
    <Card withBorder radius="md" padding="md" className={classes.card} data-on={on || undefined}>
      <Stack gap="md">
        <Group justify="space-between" wrap="nowrap" align="flex-start">
          <Group gap="sm" wrap="nowrap" className={classes.title}>
            <ThemeIcon
              variant="light"
              color={on && !unavailable ? 'yellow' : 'gray'}
              size="lg"
              radius="md"
            >
              {on && !unavailable ? <IconBulb size={20} /> : <IconBulbOff size={20} />}
            </ThemeIcon>
            <div className={classes.titleText}>
              <Text fw={600} lineClamp={1} title={name}>
                {name}
              </Text>
              <Text size="xs" c="dimmed" lineClamp={1}>
                {unavailable ? 'nicht erreichbar' : on ? `an · ${pct}%` : 'aus'}
              </Text>
            </div>
          </Group>

          {unavailable ? (
            <Badge color="gray" variant="light" size="sm">
              offline
            </Badge>
          ) : (
            <Switch
              checked={on}
              onChange={(event) => handleToggle(event.currentTarget.checked)}
              aria-label={`${name} ${on ? 'ausschalten' : 'einschalten'}`}
            />
          )}
        </Group>

        {!unavailable && dimmable && (
          <div>
            <Text size="xs" c="dimmed" mb={6}>
              Helligkeit
            </Text>
            <Slider
              value={pct}
              onChange={setPct}
              onChangeEnd={handleBrightness}
              min={0}
              max={100}
              step={1}
              label={(value) => `${value}%`}
              aria-label={`Helligkeit von ${name}`}
            />
          </div>
        )}

        {!unavailable && colorful && (
          <ColorInput
            label="Farbe"
            size="sm"
            format="hex"
            value={hex}
            onChange={setHex}
            onChangeEnd={handleColor}
            swatches={SWATCHES}
            swatchesPerRow={10}
            withEyeDropper={false}
            closeOnColorSwatchClick
          />
        )}
      </Stack>
    </Card>
  );
}
