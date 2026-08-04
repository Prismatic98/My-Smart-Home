import { useEffect, useState } from 'react';
import { Group, Slider, Text } from '@mantine/core';

import { SCALE_MAX, SCALE_MIN, clampScale } from '../model.js';

/**
 * Der eine Regler des Moduls: 0 bis 100, ganzzahlig.
 *
 * Drei Festlegungen stecken hier drin, und alle drei gelten überall:
 *
 * 1. **Geschrieben wird beim Loslassen.** Während des Ziehens ändert sich nur
 *    die Anzeige. Ein Wert, den man zwanzigmal hin- und herschiebt, ist ein
 *    Schreibvorgang und nicht zwanzig.
 * 2. **`null` heißt „nicht angegeben" und ist nicht 0.** Ein unberührter
 *    Regler steht deshalb gedämpft in der Mitte und behauptet keinen Wert.
 *    Das ist auch der Grund, warum es keinen Standardwert gibt: „0 % Angst"
 *    ist eine Aussage, die niemand getroffen hat.
 * 3. **Keine Farbe, die den Wert bewertet.** Ein hoher Wert bekommt kein Rot
 *    und keine Warnung. Er ist ein hoher Wert, keine schlechte Nachricht.
 */
export default function ScaleSlider({
  label,
  description,
  value,
  onChange,
  minLabel = '0',
  maxLabel = '100',
  disabled = false,
}) {
  const unset = value == null;
  const [shown, setShown] = useState(value ?? 50);

  // Nachziehen, wenn der Wert von außen kommt – etwa beim Blättern durch die
  // Schritte oder nach einem Abgleich.
  useEffect(() => {
    setShown(value ?? 50);
  }, [value]);

  return (
    <div>
      <Group justify="space-between" align="baseline" gap="xs" mb={2}>
        <Text size="sm" fw={500}>
          {label}
        </Text>
        <Text size="sm" c={unset ? 'dimmed' : undefined} fw={unset ? 400 : 600}>
          {unset ? 'nicht angegeben' : shown}
        </Text>
      </Group>

      {description && (
        <Text size="xs" c="dimmed" mb={6}>
          {description}
        </Text>
      )}

      <Slider
        value={shown}
        onChange={setShown}
        onChangeEnd={(next) => onChange(clampScale(next))}
        min={SCALE_MIN}
        max={SCALE_MAX}
        step={1}
        disabled={disabled}
        // Gedämpft, solange nichts angegeben ist: der Griff steht dann nur
        // irgendwo, er sagt nichts aus.
        color={unset ? 'gray' : undefined}
        label={null}
        aria-label={label}
        // Die Endpunkte beschriften statt Zwischenschritte zu markieren – die
        // Skala braucht keine Einteilung, nur zwei Anker.
        marks={[
          { value: SCALE_MIN, label: minLabel },
          { value: SCALE_MAX, label: maxLabel },
        ]}
        mb="lg"
      />
    </div>
  );
}
