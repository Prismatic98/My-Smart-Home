import { ColorPicker, Group, Slider, Stack, Switch, Text } from '@mantine/core';

import {
  brightnessPct,
  colorHex,
  colorTempRange,
  isOn,
  isUnavailable,
  supportsBrightness,
  supportsColorTemp,
  supportsRgb,
} from '../capabilities.js';
import { useOptimisticValue } from '../useOptimisticValue.js';
import { useSmartHomeServices } from '../services.js';
import classes from '../SmartHome.module.scss';

/**
 * Bedienelemente einer Lichtentität – rein capability-getrieben.
 *
 * Jede Komponente hier fragt nur, was die Entität laut ihren Attributen kann.
 * Es gibt keine Verzweigung nach Gerät, Hersteller oder Modell: eine Lampe, die
 * kein RGB meldet, bekommt keinen Farbwähler, und zwar ohne dass irgendwo ein
 * Sonderfall dafür steht.
 *
 * Drosselung: `onChange` (während des Ziehens) geht über die gedrosselte
 * Variante, `onChangeEnd` (Loslassen) sendet sofort. Ohne das würde ein
 * gezogener Regler das Anfragekontingent der Cloud-API leerfahren – siehe
 * services.js.
 *
 * `disabled` kommt von außen und sperrt zusätzlich zur eigenen Prüfung: die
 * Entität selbst kann tadellos aussehen, während das Gerät als Ganzes nicht
 * bedienbar ist (`isReachable` in deviceModel.js). Jeder Aufruf wäre dann
 * verlorenes Kontingent der Cloud-API.
 */

/** Farbvorschläge im Farbwähler: Weißtöne, dann Buntes. */
const SWATCHES = [
  '#ffffff',
  '#ffe8cc',
  '#ffd8a8',
  '#ffc078',
  '#ff8787',
  '#f783ac',
  '#b197fc',
  '#748ffc',
  '#4dabf7',
  '#38d9a9',
  '#69db7c',
  '#ffd43b',
];

/** An/Aus einer Lichtentität. */
export function PowerSwitch({ entity, size = 'md', disabled: blocked = false }) {
  const { setPower } = useSmartHomeServices();
  const [on, setOn] = useOptimisticValue(isOn(entity));
  const disabled = blocked || isUnavailable(entity);

  async function handleChange(next) {
    setOn(next);
    const ok = await setPower(entity, next);
    if (!ok) setOn(null);
  }

  return (
    <Switch
      size={size}
      checked={on}
      disabled={disabled}
      onChange={(event) => handleChange(event.currentTarget.checked)}
      aria-label={on ? 'Ausschalten' : 'Einschalten'}
    />
  );
}

/**
 * Helligkeitsregler. 0 % schaltet aus – eine Lampe mit Helligkeit 0 gibt es
 * nicht, und „aus" ist das, was der Nutzer damit meint.
 */
export function BrightnessSlider({ entity, label = 'Helligkeit', disabled: blocked = false }) {
  const { setBrightness } = useSmartHomeServices();
  const [pct, setPct] = useOptimisticValue(brightnessPct(entity));
  const disabled = blocked || isUnavailable(entity);

  function handleChange(next) {
    setPct(next);
    setBrightness(entity, next);
  }

  async function handleChangeEnd(next) {
    setPct(next);
    const ok = await setBrightness(entity, next, true);
    if (!ok) setPct(null);
  }

  return (
    <div>
      <Group justify="space-between" mb={4} wrap="nowrap">
        <Text size="xs" c="dimmed">
          {label}
        </Text>
        <Text size="xs" c="dimmed" fw={600}>
          {pct}%
        </Text>
      </Group>
      <Slider
        value={pct}
        onChange={handleChange}
        onChangeEnd={handleChangeEnd}
        disabled={disabled}
        min={0}
        max={100}
        step={1}
        label={(value) => `${value}%`}
        aria-label={label}
      />
    </div>
  );
}

/** Farbwähler. Nur sinnvoll, wenn die Entität einen RGB-Modus meldet. */
export function ColorControl({ entity, disabled: blocked = false }) {
  const { setColorHex } = useSmartHomeServices();
  const [hex, setHex] = useOptimisticValue(colorHex(entity) ?? '#ffffff');
  const disabled = blocked || isUnavailable(entity);

  function handleChange(next) {
    setHex(next);
    setColorHex(entity, next);
  }

  async function handleChangeEnd(next) {
    setHex(next);
    const ok = await setColorHex(entity, next, true);
    if (!ok) setHex(null);
  }

  return (
    <Stack gap={6}>
      <Text size="xs" c="dimmed">
        Farbe
      </Text>
      {/* ColorPicker kennt kein `disabled`. Ohne diesen Rahmen wären die
          Farbfelder einer nicht erreichbaren Lampe weiter anklickbar und
          würden Aufrufe ins Leere schicken. */}
      <div
        style={disabled ? { pointerEvents: 'none', opacity: 0.5 } : undefined}
        aria-disabled={disabled || undefined}
      >
        <ColorPicker
          format="hex"
          value={hex}
          onChange={handleChange}
          onChangeEnd={handleChangeEnd}
          swatches={SWATCHES}
          swatchesPerRow={6}
          fullWidth
        />
      </div>
    </Stack>
  );
}

/**
 * Farbtemperatur in Kelvin. Grenzen kommen von der Lampe selbst
 * (min/max_color_temp_kelvin), nicht aus einer Annahme.
 */
export function ColorTempControl({ entity, disabled: blocked = false }) {
  const { setColorTemp } = useSmartHomeServices();
  const { min, max, current } = colorTempRange(entity);
  const [kelvin, setKelvin] = useOptimisticValue(current ?? Math.round((min + max) / 2));
  const disabled = blocked || isUnavailable(entity);

  function handleChange(next) {
    setKelvin(next);
    setColorTemp(entity, next);
  }

  async function handleChangeEnd(next) {
    setKelvin(next);
    const ok = await setColorTemp(entity, next, true);
    if (!ok) setKelvin(null);
  }

  return (
    <div>
      <Group justify="space-between" mb={4} wrap="nowrap">
        <Text size="xs" c="dimmed">
          Farbtemperatur
        </Text>
        <Text size="xs" c="dimmed" fw={600}>
          {kelvin} K
        </Text>
      </Group>
      <Slider
        className={classes.tempSlider}
        value={kelvin}
        onChange={handleChange}
        onChangeEnd={handleChangeEnd}
        disabled={disabled}
        min={min}
        max={max}
        step={50}
        label={(value) => `${value} K`}
        aria-label="Farbtemperatur"
      />
    </div>
  );
}

/**
 * Alle Bedienelemente einer Lichtentität, je nach ihren Fähigkeiten.
 * Die Reihenfolge ist die des Bedienens: erst an, dann hell, dann bunt.
 *
 * Gefragt wird die ENTITÄT, nicht das Gerät: ein Gerät mit zwei echten Lampen
 * kann für jede etwas anderes können. Die gebündelten `device.capabilities`
 * entscheiden nur, welche Abschnitte die Detailseite überhaupt zeigt.
 */
export default function LightControls({ entity, label, disabled = false }) {
  if (!entity) return null;

  const unavailable = disabled || isUnavailable(entity);

  return (
    <Stack gap="md">
      <Group justify="space-between" wrap="nowrap">
        <Text fw={600}>
          {label ?? (isOn(entity) && !unavailable ? 'Eingeschaltet' : 'Ausgeschaltet')}
        </Text>
        <PowerSwitch entity={entity} size="lg" disabled={disabled} />
      </Group>

      {supportsBrightness(entity) && <BrightnessSlider entity={entity} disabled={disabled} />}
      {supportsColorTemp(entity) && <ColorTempControl entity={entity} disabled={disabled} />}
      {supportsRgb(entity) && <ColorControl entity={entity} disabled={disabled} />}
    </Stack>
  );
}
