import { useState } from 'react';
import { Button, Chip, Group, Modal, Stack, Text, Textarea } from '@mantine/core';

import { EMOTION_LABELS } from '../content/emotions.js';
import { HELP_TEXTS } from '../content/prompts.js';
import { CLARITY_COLOR } from '../lib/appearance.js';
import { createRecord } from '../useClarity.js';
import { newEmotion, newThought } from '../model.js';
import ScaleSlider from './ScaleSlider.jsx';

/**
 * „Schnell festhalten" – der Eingang für unterwegs.
 *
 * Drei Fragen auf einem Bildschirm, keine Schritte, kein Blättern: Situation,
 * Gedanke, Gefühl. Das ist der Fall, für den das Modul gebaut ist – in der
 * Bahn, kurz nachdem etwas passiert ist, mit einer Hand. Was hier entsteht,
 * ist ein Entwurf; die restlichen Schritte haben Zeit bis zum Abend.
 *
 * Bewusst nicht dasselbe Formular in klein: der mehrstufige Editor fragt nach
 * Belegen, Denkfehlern und einer anderen Sicht. Das braucht Ruhe. Wer das
 * unterwegs vorgesetzt bekommt, hält am Ende gar nichts fest.
 *
 * Der Datensatz entsteht erst beim Sichern. Ein Abbruch hinterlässt deshalb
 * nichts, was später weggeräumt werden müsste.
 */
export default function QuickCaptureModal({ opened, onClose, onCreated }) {
  const [situation, setSituation] = useState('');
  const [thought, setThought] = useState('');
  const [feeling, setFeeling] = useState('');
  const [intensity, setIntensity] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  function reset() {
    setSituation('');
    setThought('');
    setFeeling('');
    setIntensity(null);
    setError(null);
  }

  function close() {
    reset();
    onClose();
  }

  const empty =
    situation.trim().length === 0 && thought.trim().length === 0 && feeling.length === 0;

  async function save(continueEditing) {
    setSaving(true);
    setError(null);
    try {
      const record = await createRecord('thoughtRecords', {
        situation: situation.trim(),
        situationAt: Date.now(),
        automaticThoughts: thought.trim().length > 0 ? [newThought(thought.trim())] : [],
        emotions:
          feeling.length > 0
            ? [{ ...newEmotion(feeling), intensityBefore: intensity }]
            : [],
        status: 'draft',
      });
      reset();
      onCreated(record, continueEditing);
    } catch (cause) {
      setError(`Das konnte nicht gespeichert werden: ${cause.message}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal opened={opened} onClose={close} title="Schnell festhalten" size="lg" radius="md" centered>
      <Stack gap="md">
        <Text size="sm" c="dimmed">
          {HELP_TEXTS.trigger}
        </Text>

        <Textarea
          label="Was war los?"
          placeholder="Kurz, wie du es jemandem erzählen würdest"
          value={situation}
          onChange={(event) => setSituation(event.currentTarget.value)}
          autosize
          minRows={2}
          data-autofocus
        />

        <Textarea
          label="Was ist dir durch den Kopf gegangen?"
          placeholder="Der Gedanke oder das innere Bild, so wie es kam"
          value={thought}
          onChange={(event) => setThought(event.currentTarget.value)}
          autosize
          minRows={2}
        />

        <div>
          <Text size="sm" fw={500} mb={6}>
            Was hast du in dem Moment gefühlt?
          </Text>
          {/* Nur eine Auswahl, und die ist optional. Mehrere Gefühle samt
              Stärke gehören in den Editor – hier zählt Tempo. */}
          <Group gap={6} wrap="wrap">
            {EMOTION_LABELS.map((label) => (
              <Chip
                key={label}
                size="sm"
                variant="light"
                color={CLARITY_COLOR}
                checked={feeling === label}
                onChange={() => setFeeling(feeling === label ? '' : label)}
              >
                {label}
              </Chip>
            ))}
          </Group>
        </div>

        {feeling.length > 0 && (
          <ScaleSlider
            label="Wie stark?"
            value={intensity}
            onChange={setIntensity}
          />
        )}

        {error && (
          <Text size="sm" c="red">
            {error}
          </Text>
        )}

        <Group justify="flex-end" gap="sm">
          <Button variant="default" onClick={close}>
            Abbrechen
          </Button>
          <Button variant="light" disabled={empty || saving} onClick={() => save(true)}>
            Sichern und weiter
          </Button>
          <Button color={CLARITY_COLOR} disabled={empty || saving} onClick={() => save(false)}>
            Sichern
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
