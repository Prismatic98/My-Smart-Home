import { useEffect, useState } from 'react';
import { Group, Slider, Text } from '@mantine/core';

import { SCALE_MAX, SCALE_MIN, clampScale } from '../model.js';
import { PAUSE_COLOR } from '../lib/appearance.js';
import classes from './ScaleSlider.module.scss';

/**
 * Der eine Regler des Moduls: 0 bis 100, ganzzahlig.
 *
 * Vier Festlegungen stecken hier drin, und alle vier gelten überall:
 *
 * 1. **Die Anzeige folgt dem Finger, geschrieben wird beim Loslassen.**
 *    Während des Ziehens ändert sich nur die Zahl daneben; in die Datenbank
 *    geht der Wert einmal, wenn man loslässt. Ein Wert, den man zwanzigmal
 *    hin- und herschiebt, ist ein Schreibvorgang und nicht zwanzig.
 * 2. **`null` heißt „nicht angegeben" und ist nicht 0.** Ein unberührter
 *    Regler steht deshalb gedämpft in der Mitte und behauptet keinen Wert.
 *    Sobald man ihn anfasst, steht dort eine Zahl – auch schon während des
 *    Ziehens, sonst sähe man beim ersten Anfassen minutenlang „nicht
 *    angegeben".
 * 3. **Die Skala ist beziffert, nicht bewertet.** Unter den Enden stehen 0 und
 *    100 und keine Wörter: „gar nicht" und „völlig" sind Deutungen, und in der
 *    Sitzung wird ohnehin über Zahlen gesprochen.
 * 4. **Keine Farbe, die den Wert bewertet.** Der Regler trägt die Farbe des
 *    Moduls – bei 10 dieselbe wie bei 90. Ein hoher Wert ist ein hoher Wert,
 *    keine schlechte Nachricht.
 */
export default function ScaleSlider({ label, description, value, onChange, disabled = false }) {
  // null = noch nichts angegeben. Wird beim ersten Ziehen zu einer Zahl,
  // unabhängig davon, was schon gespeichert ist.
  const [shown, setShown] = useState(value ?? null);

  // Nachziehen, wenn der Wert von außen kommt – etwa beim Blättern durch die
  // Schritte oder nach einem Abgleich.
  useEffect(() => {
    setShown(value ?? null);
  }, [value]);

  return (
    <div className={classes.wrapper}>
      <Group justify="space-between" align="baseline" gap="xs" mb={6}>
        <Text size="sm" fw={500}>
          {label}
        </Text>
        <Text
          size="sm"
          fw={shown == null ? 400 : 700}
          c={shown == null ? 'dimmed' : PAUSE_COLOR}
          className={classes.value}
        >
          {shown ?? 'nicht angegeben'}
        </Text>
      </Group>

      {description && (
        <Text size="xs" c="dimmed" mb={8}>
          {description}
        </Text>
      )}

      <Slider
        value={shown ?? 50}
        onChange={(next) => setShown(next)}
        onChangeEnd={(next) => onChange(clampScale(next))}
        min={SCALE_MIN}
        max={SCALE_MAX}
        step={1}
        disabled={disabled}
        // Gedämpft, solange nichts angegeben ist: der Griff steht dann nur
        // irgendwo, er sagt nichts aus.
        color={shown == null ? 'gray' : PAUSE_COLOR}
        label={null}
        aria-label={label}
        // Die Endpunkte beziffern statt Zwischenschritte zu markieren – die
        // Skala braucht keine Einteilung, nur zwei Anker.
        marks={[
          { value: SCALE_MIN, label: String(SCALE_MIN) },
          { value: SCALE_MAX, label: String(SCALE_MAX) },
        ]}
      />
    </div>
  );
}
