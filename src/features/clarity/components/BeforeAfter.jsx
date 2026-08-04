import { Group, Text } from '@mantine/core';

import classes from './BeforeAfter.module.scss';

/**
 * „vorher 85 · jetzt 40" – die beiden Werte der Spalte „Ergebnis"
 * nebeneinander.
 *
 * Das ist genau das, was das Arbeitsblatt am Ende zeigt: derselbe Gedanke,
 * dasselbe Gefühl, noch einmal eingeschätzt. Deshalb steht es hier auch nur
 * als zwei Zahlen nebeneinander – **ohne Differenz, ohne Pfeil nach oben oder
 * unten, ohne Farbe.** Sobald daraus „−45" würde, hätte die App eine Richtung
 * bewertet, in die es zu gehen hat, und eine Sitzung, nach der die Zahl
 * gestiegen ist, sähe aus wie ein Misserfolg.
 *
 * Fehlt der zweite Wert, steht dort ein Strich und kein Platzhalter, der zum
 * Ausfüllen auffordert.
 */
export default function BeforeAfter({ before, after, label = 'vorher' }) {
  if (before == null && after == null) return null;

  return (
    <Group gap={6} align="baseline" mb="xs" className={classes.row}>
      <Text size="xs" c="dimmed">
        {label}
      </Text>
      <Text size="sm" fw={600} c={before == null ? 'dimmed' : undefined}>
        {before ?? '—'}
      </Text>
      <Text size="xs" c="dimmed">
        ·
      </Text>
      <Text size="xs" c="dimmed">
        jetzt
      </Text>
      <Text size="sm" fw={600} c={after == null ? 'dimmed' : undefined}>
        {after ?? '—'}
      </Text>
    </Group>
  );
}
