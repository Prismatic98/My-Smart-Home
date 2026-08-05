import { ActionIcon, Box, Button, Card, Group, Stack, Text } from '@mantine/core';
import { IconPlus, IconX } from '@tabler/icons-react';

import { HELP_TEXTS } from '../content/prompts.js';
import { isRichTextEmpty } from '../lib/richText.js';
import { newThought } from '../model.js';
import BeforeAfter from './BeforeAfter.jsx';
import RichTextField from './RichTextField.jsx';
import RichTextView from './RichTextView.jsx';
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
    const withText = thoughts.filter((thought) => !isRichTextEmpty(thought.text));

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
            <Box mb="xs">
              <RichTextView value={thought.text} />
            </Box>

            <BeforeAfter before={thought.beliefBefore} after={thought.beliefAfter} mb="xs" />

            <ScaleSlider
              label="Wie sehr glaube ich ihm jetzt?"
              value={thought.beliefAfter}
              onChange={(value) => replace(thought.id, { beliefAfter: value }, true)}
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
            <Box style={{ flex: 1, minWidth: 0 }}>
              <RichTextField
                value={thought.text}
                onValueChange={(text) => replace(thought.id, { text }, false)}
                placeholder="Der Gedanke oder das innere Bild, so wie es kam"
                minRows={2}
                ariaLabel="Der Gedanke"
              />
            </Box>

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
