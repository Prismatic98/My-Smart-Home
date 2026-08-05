import { useState } from 'react';
import { ActionIcon, Card, Chip, Group, Stack, Text, TextInput } from '@mantine/core';
import { IconPlus, IconX } from '@tabler/icons-react';

import { EMOTION_LABELS } from '../content/emotions.js';
import { CLARITY_COLOR } from '../lib/appearance.js';
import { newEmotion } from '../model.js';
import BeforeAfter from './BeforeAfter.jsx';
import ScaleSlider from './ScaleSlider.jsx';

/**
 * Die Gefühle eines Protokolls – Spalte „Gefühl(e)" des Arbeitsblattes.
 *
 * Die Vorschläge stehen in **einer** fortlaufenden Reihe und nicht nach
 * Gruppen getrennt. Gruppenweise umbrochen entstanden zwischen den Zeilen
 * unterschiedlich große Lücken, und die sahen aus, als fehlte dort etwas.
 * Die Reihenfolge der Wörter folgt weiterhin den Gruppen aus emotions.js –
 * das hilft beim Finden, ohne dass es die Auswahl einordnet.
 *
 * Gespeichert wird nur das Wort. Freitext bleibt immer möglich: eine feste
 * Auswahlliste hieße, dass ein Gefühl, das nicht darin vorkommt, nicht
 * eingetragen werden kann.
 */
// Anders als bei den Gedanken gibt es hier kein Freitextfeld, in dem laufend
// getippt wird – jede Änderung ist eine Auswahl oder ein losgelassener Regler
// und wird deshalb sofort geschrieben.
export default function EmotionsEditor({ emotions = [], phase = 'before', onChangeNow }) {
  const [custom, setCustom] = useState('');
  const chosen = emotions.map((emotion) => emotion.label);

  function add(label) {
    const clean = label.trim();
    if (clean.length === 0) return;
    if (chosen.includes(clean)) return;
    onChangeNow([...emotions, newEmotion(clean)]);
  }

  function replace(id, changes) {
    onChangeNow(
      emotions.map((emotion) => (emotion.id === id ? { ...emotion, ...changes } : emotion))
    );
  }

  if (phase === 'after') {
    if (emotions.length === 0) {
      return (
        <Text size="sm" c="dimmed">
          Im Schritt „Gefühle" steht noch nichts.
        </Text>
      );
    }

    return (
      <Stack gap="md">
        {emotions.map((emotion) => (
          <Card key={emotion.id} withBorder radius="md" padding="md">
            <Text size="sm" fw={500} mb="xs">
              {emotion.label}
            </Text>

            <BeforeAfter before={emotion.intensityBefore} after={emotion.intensityAfter} />

            <ScaleSlider
              label="Wie stark ist es jetzt?"
              value={emotion.intensityAfter}
              onChange={(value) => replace(emotion.id, { intensityAfter: value })}
            />
          </Card>
        ))}
      </Stack>
    );
  }

  return (
    <Stack gap="md">
      <div>
        <Text size="sm" fw={500} mb={6}>
          Vorschläge
        </Text>
        <Group gap={6} wrap="wrap">
          {EMOTION_LABELS.map((label) => (
            <Chip
              key={label}
              size="sm"
              variant="light"
              color={CLARITY_COLOR}
              checked={chosen.includes(label)}
              onChange={() => {
                if (chosen.includes(label)) {
                  onChangeNow(emotions.filter((emotion) => emotion.label !== label));
                } else {
                  add(label);
                }
              }}
            >
              {label}
            </Chip>
          ))}
        </Group>
      </div>

      <Group align="flex-end" gap="xs" wrap="nowrap">
        <TextInput
          label="Eigenes Wort"
          placeholder="…"
          value={custom}
          onChange={(event) => setCustom(event.currentTarget.value)}
          onKeyDown={(event) => {
            if (event.key !== 'Enter') return;
            event.preventDefault();
            add(custom);
            setCustom('');
          }}
          style={{ flex: 1 }}
        />
        <ActionIcon
          size={36}
          variant="light"
          aria-label="Gefühl hinzufügen"
          onClick={() => {
            add(custom);
            setCustom('');
          }}
        >
          <IconPlus size={18} />
        </ActionIcon>
      </Group>

      {emotions.map((emotion) => (
        <Card key={emotion.id} withBorder radius="md" padding="md">
          <Group justify="space-between" wrap="nowrap" mb="xs">
            <Text size="sm" fw={500}>
              {emotion.label}
            </Text>
            <ActionIcon
              variant="subtle"
              color="gray"
              aria-label={`${emotion.label} entfernen`}
              onClick={() => onChangeNow(emotions.filter((entry) => entry.id !== emotion.id))}
            >
              <IconX size={16} />
            </ActionIcon>
          </Group>

          <ScaleSlider
            label="Wie stark?"
            value={emotion.intensityBefore}
            onChange={(value) => replace(emotion.id, { intensityBefore: value })}
          />
        </Card>
      ))}
    </Stack>
  );
}
