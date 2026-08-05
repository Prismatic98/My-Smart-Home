import { Accordion, Badge, Checkbox, Group, Stack, Text } from '@mantine/core';

import { DISTORTIONS } from '../content/distortions.js';
import { PAUSE_COLOR } from '../lib/appearance.js';
import classes from './DistortionList.module.scss';

/**
 * Der Denkfehler-Katalog.
 *
 * Dieselbe Komponente an zwei Stellen: als reines Nachschlagewerk (ohne
 * `selected`) und als Auswahl im Gedankenprotokoll (mit). Zwei Fassungen
 * hießen zwei Orte, an denen dieselben zwölf Beschreibungen auseinander
 * laufen können.
 *
 * **Es wird nichts automatisch erkannt.** Kein eingegebener Text wird
 * durchsucht, kein Eintrag vorgeschlagen, nichts hervorgehoben. Ein Muster im
 * eigenen Denken zu erkennen ist die Übung – eine App, die es einem abnimmt,
 * hat sie erledigt statt geübt. Aus demselben Grund steht zu jedem Eintrag
 * eine Frage und keine Handlungsanweisung.
 *
 * Der aufgeklappte Eintrag hat drei Teile mit deutlich verschiedenem Gewicht,
 * statt dreier grauer Absätze: **Beschreibung** als schlichter Text,
 * **Beispiel** als Zitat hinter einem Strich, **Frage** auf gedeckter Fläche
 * in der Modulfarbe. Die beiden letzten sind genau die Bausteine der
 * Protokoll-Kachel (Gedanke bzw. Vorsatz) – dieselbe Bedeutung, dieselbe Form.
 *
 * Die Frage trägt weder Beschriftung noch Zeichen: sie steht als einziger Satz
 * in einem Feld, das nur ihr gehört, und endet auf ein Fragezeichen. Ein Wort
 * „Frage" davor sagt nichts, was der Satz nicht selbst sagt.
 *
 * Die Nummer ist die des Blattes aus der Sitzung: fällt dort eine Zahl, findet
 * man den Eintrag hier wieder.
 */
export default function DistortionList({ selected, onToggle }) {
  const selectable = typeof onToggle === 'function';
  const chosen = new Set(selected ?? []);

  return (
    <Accordion variant="separated" radius="md" multiple>
      {DISTORTIONS.map((entry, index) => (
        <Accordion.Item
          key={entry.id}
          value={entry.id}
          className={chosen.has(entry.id) ? classes.chosen : undefined}
        >
          {/* Haken und Aufklappen sind zwei verschiedene Absichten und deshalb
              zwei verschiedene Flächen – ein Tippen kann nicht beides
              bedeuten. Dieselbe Regel wie in der Dateiablage. */}
          <Group wrap="nowrap" gap={0} pr="xs">
            {selectable && (
              <Checkbox
                checked={chosen.has(entry.id)}
                onChange={() => onToggle(entry.id)}
                aria-label={`${entry.label} auswählen`}
                ml="md"
                color={PAUSE_COLOR}
              />
            )}
            <Accordion.Control>
              <Group gap="sm" wrap="nowrap">
                <Badge size="lg" fz="sm" fw={700} variant="light" color={PAUSE_COLOR} circle>
                  {index + 1}
                </Badge>
                <Text size="sm" fw={chosen.has(entry.id) ? 600 : 500}>
                  {entry.label}
                </Text>
              </Group>
            </Accordion.Control>
          </Group>

          <Accordion.Panel>
            <Stack gap="sm">
              <Text size="sm">{entry.description}</Text>

              <Text size="sm" c="dimmed" className={classes.example}>
                {entry.example}
              </Text>

              <Text size="sm" className={classes.question}>
                {entry.question}
              </Text>
            </Stack>
          </Accordion.Panel>
        </Accordion.Item>
      ))}
    </Accordion>
  );
}
