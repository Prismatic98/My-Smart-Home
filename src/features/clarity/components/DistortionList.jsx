import { Accordion, Badge, Checkbox, Group, Stack, Text } from '@mantine/core';

import { DISTORTIONS } from '../content/distortions.js';

/**
 * Der Denkfehler-Katalog.
 *
 * Dieselbe Komponente an zwei Stellen: als reines Nachschlagewerk (ohne
 * `selected`) und als Auswahl im Gedankenprotokoll (mit). Zwei Fassungen
 * hießen zwei Orte, an denen dieselben vierzehn Beschreibungen auseinander
 * laufen können.
 *
 * **Es wird nichts automatisch erkannt.** Kein eingegebener Text wird
 * durchsucht, kein Eintrag vorgeschlagen, nichts hervorgehoben. Ein Muster im
 * eigenen Denken zu erkennen ist die Übung – eine App, die es einem abnimmt,
 * hat sie erledigt statt geübt. Aus demselben Grund steht zu jedem Eintrag
 * eine Frage und keine Handlungsanweisung.
 */
export default function DistortionList({ selected, onToggle }) {
  const selectable = typeof onToggle === 'function';
  const chosen = new Set(selected ?? []);

  return (
    <Accordion variant="separated" radius="md" multiple>
      {DISTORTIONS.map((entry) => (
        <Accordion.Item key={entry.id} value={entry.id}>
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
              />
            )}
            <Accordion.Control>
              <Text size="sm" fw={chosen.has(entry.id) ? 600 : 400}>
                {entry.label}
              </Text>
            </Accordion.Control>
          </Group>

          <Accordion.Panel>
            <Stack gap="xs">
              <Text size="sm">{entry.description}</Text>

              <Text size="sm" c="dimmed" fs="italic">
                {entry.example}
              </Text>

              <Group gap={6} wrap="nowrap" align="flex-start">
                <Badge size="xs" variant="light" color="gray" mt={2}>
                  Frage
                </Badge>
                <Text size="sm">{entry.question}</Text>
              </Group>
            </Stack>
          </Accordion.Panel>
        </Accordion.Item>
      ))}
    </Accordion>
  );
}
