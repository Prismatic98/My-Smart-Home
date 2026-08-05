import { Badge, Group } from '@mantine/core';
import { IconArrowRight } from '@tabler/icons-react';

import { CLARITY_COLOR } from '../lib/appearance.js';
import classes from './BeforeAfter.module.scss';

/**
 * „Vorher 85 → Nachher 40" – die beiden Werte nebeneinander, als zwei
 * Plaketten mit einem Pfeil dazwischen.
 *
 * Das ist genau das, was das Arbeitsblatt am Ende zeigt: derselbe Gedanke,
 * dasselbe Gefühl, noch einmal eingeschätzt. Deshalb stehen hier auch nur die
 * beiden Zahlen – **ohne Differenz.** Sobald daraus „−45" würde, hätte die App
 * eine Richtung bewertet, in die es zu gehen hat, und eine Sitzung, nach der
 * die Zahl gestiegen ist, sähe aus wie ein Misserfolg.
 *
 * **Der Pfeil zeigt die Zeitfolge, nicht eine Richtung, in die es zu gehen
 * hat:** er steht waagerecht zwischen den beiden Zeitpunkten und liegt immer
 * gleich, ob die Zahl gestiegen oder gefallen ist. Ein Pfeil nach oben oder
 * unten wäre etwas anderes und gehört hier nicht hin.
 *
 * Beide Plaketten tragen die Modulfarbe, „Vorher" in einem dunklen und
 * „Nachher" in einem hellen Ton. **Das unterscheidet die Zeitpunkte, nicht die
 * Werte:** der dunkle Ton heißt „das war der Stand von damals" und sieht bei
 * 10 genauso aus wie bei 90. Die Farbe hängt nie von der Zahl ab – hier wird
 * nichts gelobt und nichts bemängelt.
 *
 * `size` unterscheidet die zwei Orte: auf der Übersichtskachel eine Stufe
 * größer, im Editor kleiner, weil die Plaketten dort neben einem Regler stehen.
 *
 * Fehlt ein Wert, steht dort ein Strich und kein Platzhalter, der zum Ausfüllen
 * auffordert.
 */
export default function BeforeAfter({ before, after, size = 'md', ...rest }) {
  if (before == null && after == null) return null;

  return (
    <Group gap={8} wrap="nowrap" {...rest}>
      <Value size={size} label="Vorher" value={before} shade={DARK} />
      <IconArrowRight size={16} className={classes.arrow} aria-hidden />
      <Value size={size} label="Nachher" value={after} shade={LIGHT} />
    </Group>
  );
}

/**
 * Die beiden Töne der Modulfarbe. Als Abstufung derselben Farbe und nicht als
 * zwei Farbnamen: die Farbe des Moduls steht an einer Stelle (CLARITY_COLOR),
 * hier steht nur, wie hell sie jeweils ausfällt.
 *
 * Beide sind dunkel genug für weiße Schrift – die beiden Plaketten sollen
 * dieselbe Schriftfarbe tragen, und ein noch hellerer Ton wäre damit nicht
 * mehr zu lesen.
 */
const DARK = 9;
const LIGHT = 5;

function Value({ label, value, size, shade }) {
  return (
    <Badge
      size={size}
      radius="sm"
      variant="filled"
      color={`${CLARITY_COLOR}.${shade}`}
      className={classes.badge}
    >
      <span className={classes.label}>{label}</span>
      <span className={classes.value}>{value ?? '—'}</span>
    </Badge>
  );
}
