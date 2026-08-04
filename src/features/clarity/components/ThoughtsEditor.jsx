import { ActionIcon, Button, Card, Group, Stack, Text, Textarea } from '@mantine/core';
import { IconPlus, IconX } from '@tabler/icons-react';

import { HELP_TEXTS } from '../content/prompts.js';
import { newThought } from '../model.js';
import BeforeAfter from './BeforeAfter.jsx';
import ScaleSlider from './ScaleSlider.jsx';

/**
 * Die automatischen Gedanken eines Protokolls – Spalte „Automatischer
 * Gedanke" des Arbeitsblattes.
 *
 * Ein Gedanke besteht aus dem Wortlaut und daraus, wie sehr man ihm im Moment
 * der Situation geglaubt hat. Beides gehört zusammen und steht deshalb in
 * einer Karte statt in zwei getrennten Listen.
 *
 * `phase` steuert, welcher Wert gezeigt wird: beim Schreiben der Glaube
 * vorher, im Schritt „Ergebnis" der Glaube jetzt. Der Wert von vorher bleibt
 * dort sichtbar, aber nicht änderbar – wer ihn nachträglich anpassen könnte,
 * bekäme am Ende einen Unterschied zu sehen, den er selbst hineingeschrieben
 * hat.
 */
export default function ThoughtsEditor({ thoughts = [], phase = 'before', onChange, onChangeNow }) {
  function replace(id, changes, immediate) {
    const next = thoughts.map((thought) =>
      thought.id === id ? { ...thought, ...changes } : thought
    );
    (immediate ? onChangeNow : onChange)(next);
  }

  if (phase === 'after') {
    const withText = thoughts.filter((thought) => thought.text.trim().length > 0);

    if (withText.length === 0) {
      return (
        <Text size="sm" c="dimmed">
          Im Schritt „Gedanken" steht noch nichts.
        </Text>
      );
    }

    return (
      <Stack gap="md">
        {withText.map((thought) => (
          <Card key={thought.id} withBorder radius="md" padding="md">
            <Text size="sm" mb="xs">
              {thought.text}
            </Text>

            <BeforeAfter before={thought.beliefBefore} after={thought.beliefAfter} />

            <ScaleSlider
              label="Wie sehr glaube ich ihm jetzt?"
              value={thought.beliefAfter}
              onChange={(value) => replace(thought.id, { beliefAfter: value }, true)}
              minLabel="gar nicht"
              maxLabel="völlig"
            />
          </Card>
        ))}
      </Stack>
    );
  }

  return (
    <Stack gap="md">
      {thoughts.map((thought) => (
        <Card key={thought.id} withBorder radius="md" padding="md">
          <Group align="flex-start" wrap="nowrap" gap="xs" mb="sm">
            <Textarea
              value={thought.text}
              onChange={(event) => replace(thought.id, { text: event.currentTarget.value }, false)}
              placeholder="Der Gedanke oder das innere Bild, so wie es kam"
              autosize
              minRows={2}
              style={{ flex: 1 }}
            />

            <ActionIcon
              variant="subtle"
              color="gray"
              onClick={() => onChangeNow(thoughts.filter((entry) => entry.id !== thought.id))}
              aria-label="Diesen Gedanken entfernen"
            >
              <IconX size={16} />
            </ActionIcon>
          </Group>

          <ScaleSlider
            label="Wie sehr habe ich ihm geglaubt?"
            description={HELP_TEXTS.belief}
            value={thought.beliefBefore}
            onChange={(value) => replace(thought.id, { beliefBefore: value }, true)}
            minLabel="gar nicht"
            maxLabel="völlig"
          />
        </Card>
      ))}

      <Button
        variant="light"
        leftSection={<IconPlus size={16} />}
        onClick={() => onChangeNow([...thoughts, newThought()])}
      >
        {thoughts.length === 0 ? 'Gedanken festhalten' : 'Weiterer Gedanke'}
      </Button>
    </Stack>
  );
}
