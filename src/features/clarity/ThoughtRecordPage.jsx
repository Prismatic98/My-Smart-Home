import { useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Card,
  Container,
  Group,
  Menu,
  Skeleton,
  Stack,
  Text,
  Textarea,
  TextInput,
  Title,
} from '@mantine/core';
import {
  IconArrowLeft,
  IconArrowRight,
  IconCheck,
  IconDots,
  IconTrash,
} from '@tabler/icons-react';

import ConfirmDeleteModal from './components/ConfirmDeleteModal.jsx';
import DistortionList from './components/DistortionList.jsx';
import EmotionsEditor from './components/EmotionsEditor.jsx';
import ScaleSlider from './components/ScaleSlider.jsx';
import SocraticImpulses from './components/SocraticImpulses.jsx';
import StepBar from './components/StepBar.jsx';
import ThoughtsEditor from './components/ThoughtsEditor.jsx';
import { HELP_TEXTS } from './content/prompts.js';
import {
  THOUGHT_STEPS,
  clampStepIndex,
  fromDateTimeInput,
  toDateTimeInput,
} from './lib/thoughtRecord.js';
import { deleteRecord } from './useClarity.js';
import { useRecordDraft } from './useRecordDraft.js';
import classes from './ThoughtRecord.module.scss';

/**
 * Der mehrstufige Editor eines Gedankenprotokolls.
 *
 * Die sechs Schritte sind die Spalten des Arbeitsblattes aus der Sitzung, in
 * dessen Reihenfolge (siehe THOUGHT_STEPS). Wer das Blatt vor sich hat, findet
 * hier dieselben Fragen in derselben Abfolge – nur eine Spalte je Bildschirm
 * statt sechs nebeneinander, weil eine Tabelle mit sechs Spalten auf einem
 * Handy nicht zu bedienen ist.
 *
 * Eigene Route statt Modal – dieselbe Entscheidung wie bei der Gerätedetail-
 * seite und der Dateivorschau: nur so funktionieren Deep-Links, und nur so
 * kann die Zurück-Taste des Handys etwas Sinnvolles tun.
 *
 * **Der Schritt steht in der URL** (`?schritt=3`). Damit legt jeder Weiter-
 * Klick einen Verlaufseintrag an und die Zurück-Taste geht einen Schritt
 * zurück, statt das halb geschriebene Protokoll zu verlassen. Aus Schritt 1
 * heraus führt sie zurück in die Übersicht – wie erwartet.
 *
 * **Es gibt kein Speichern und kein Abbrechen.** Geschrieben wird laufend im
 * Hintergrund (useRecordDraft). Ein Protokoll entsteht in mehreren Anläufen,
 * oft über Stunden; ein Formular, das seinen Inhalt beim Wegwischen verliert,
 * füllt man kein zweites Mal aus.
 */
export default function ThoughtRecordPage() {
  const { recordId } = useParams();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();

  const { draft, isLoading, missing, set, setNow, flush } = useRecordDraft(
    'thoughtRecords',
    recordId
  );
  const [confirmDelete, setConfirmDelete] = useState(false);
  const responseRef = useRef(null);

  const step = clampStepIndex(Number(params.get('schritt') ?? '1') - 1);

  function goToStep(index) {
    flush();
    setParams({ schritt: String(clampStepIndex(index) + 1) });
    window.scrollTo({ top: 0 });
  }

  async function handleDelete() {
    await deleteRecord('thoughtRecords', recordId);
    setConfirmDelete(false);
    navigate('/clarity', { replace: true });
  }

  if (missing) {
    return (
      <Container size="sm" px={0}>
        <BackLink />
        <Alert color="gray" variant="light" mt="md">
          Dieses Protokoll gibt es nicht mehr.
        </Alert>
      </Container>
    );
  }

  if (isLoading || !draft) {
    return (
      <Container size="sm" px={0}>
        <BackLink />
        <Stack gap="md" mt="md">
          <Skeleton height={36} radius="md" />
          <Skeleton height={200} radius="md" />
        </Stack>
      </Container>
    );
  }

  const current = THOUGHT_STEPS[step];
  const complete = draft.status === 'complete';
  const thoughts = draft.automaticThoughts ?? [];

  /** Setzt eine Hilfsfrage als Zwischenüberschrift in das Antwortfeld. */
  function insertQuestion(question) {
    const existing = (draft.response ?? '').replace(/\s+$/, '');
    const next = existing.length > 0 ? `${existing}\n\n${question}\n` : `${question}\n`;
    set({ response: next });

    // Der Cursor gehört hinter die Frage – sonst muss man erst hintippen,
    // bevor man antworten kann.
    requestAnimationFrame(() => {
      const field = responseRef.current;
      if (!field) return;
      field.focus();
      field.setSelectionRange(next.length, next.length);
    });
  }

  return (
    <Container size="sm" px={0} pb={96} className={classes.page}>
      <Group justify="space-between" align="center" wrap="nowrap" mb="sm">
        <BackLink />

        <Group gap="xs" wrap="nowrap">
          {complete && (
            <Badge variant="default" size="sm">
              Abgeschlossen
            </Badge>
          )}
          <Menu position="bottom-end" withinPortal shadow="md">
            <Menu.Target>
              <ActionIcon variant="subtle" color="gray" aria-label="Aktionen für dieses Protokoll">
                <IconDots size={18} />
              </ActionIcon>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Item
                color="red"
                leftSection={<IconTrash size={16} />}
                onClick={() => setConfirmDelete(true)}
              >
                Löschen
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
        </Group>
      </Group>

      <StepBar current={step} record={draft} onSelect={goToStep} />

      <header className={classes.header}>
        <Title order={2} className={classes.question}>
          {current.question}
        </Title>
        {current.hint && (
          <Text size="sm" c="dimmed" mt={6}>
            {current.hint}
          </Text>
        )}
      </header>

      {/* Ab dem Denkfehler-Schritt stehen die Gedanken oben: ab hier dreht
          sich alles um sie, und sie müssen lesbar sein, ohne dass man dafür
          zurückblättert. */}
      {(current.key === 'distortions' || current.key === 'response') && (
        <ThoughtsRecap thoughts={thoughts} />
      )}

      <Stack gap="lg">
        {current.key === 'situation' && (
          <>
            <Textarea
              label="Die Situation"
              placeholder="Wo, mit wem, was ist geschehen — so, wie du es jemandem erzählen würdest"
              value={draft.situation ?? ''}
              onChange={(event) => set({ situation: event.currentTarget.value })}
              onBlur={flush}
              autosize
              minRows={4}
            />

            <TextInput
              type="datetime-local"
              label="Wann war das?"
              value={toDateTimeInput(draft.situationAt)}
              onChange={(event) =>
                setNow({
                  situationAt: fromDateTimeInput(event.currentTarget.value, draft.situationAt),
                })
              }
            />

            <Textarea
              label="Hat dein Körper etwas gemacht?"
              description="Herzklopfen, Wärme im Gesicht, enger Hals — wenn dir etwas aufgefallen ist."
              value={draft.bodySensations ?? ''}
              onChange={(event) => set({ bodySensations: event.currentTarget.value })}
              onBlur={flush}
              autosize
              minRows={2}
            />
          </>
        )}

        {current.key === 'thoughts' && (
          <ThoughtsEditor
            thoughts={thoughts}
            onChange={(next) => set({ automaticThoughts: next })}
            onChangeNow={(next) => setNow({ automaticThoughts: next })}
          />
        )}

        {current.key === 'feelings' && (
          <EmotionsEditor
            emotions={draft.emotions ?? []}
            onChangeNow={(next) => setNow({ emotions: next })}
          />
        )}

        {current.key === 'distortions' && (
          <>
            <Text size="sm" c="dimmed">
              {HELP_TEXTS.distortions}
            </Text>

            <DistortionList
              selected={draft.distortionIds ?? []}
              onToggle={(id) => {
                const chosen = draft.distortionIds ?? [];
                setNow({
                  distortionIds: chosen.includes(id)
                    ? chosen.filter((entry) => entry !== id)
                    : [...chosen, id],
                });
              }}
            />
          </>
        )}

        {current.key === 'response' && (
          <>
            <Textarea
              ref={responseRef}
              label="Deine Antwort"
              description={HELP_TEXTS.response}
              value={draft.response ?? ''}
              onChange={(event) => set({ response: event.currentTarget.value })}
              onBlur={flush}
              autosize
              minRows={6}
            />

            <SocraticImpulses onInsert={insertQuestion} />

            <ScaleSlider
              label="Wie sehr glaube ich dieser Antwort?"
              value={draft.responseBelief}
              onChange={(value) => setNow({ responseBelief: value })}
              minLabel="gar nicht"
              maxLabel="völlig"
            />
          </>
        )}

        {current.key === 'outcome' && (
          <>
            <ThoughtsEditor
              thoughts={thoughts}
              phase="after"
              onChange={(next) => set({ automaticThoughts: next })}
              onChangeNow={(next) => setNow({ automaticThoughts: next })}
            />

            <EmotionsEditor
              emotions={draft.emotions ?? []}
              phase="after"
              onChangeNow={(next) => setNow({ emotions: next })}
            />

            <Textarea
              label="Was tue ich jetzt?"
              description="Was du dir vornimmst — oder schon getan hast."
              value={draft.nextStep ?? ''}
              onChange={(event) => set({ nextStep: event.currentTarget.value })}
              onBlur={flush}
              autosize
              minRows={2}
            />

            {/* Abschließen heißt nur: raus aus den Entwürfen. Kein Lob, keine
                Bestätigung, keine Auswertung – es ändert allein, in welcher
                Liste das Protokoll steht. */}
            {complete ? (
              <Button variant="default" onClick={() => setNow({ status: 'draft' })}>
                Wieder als Entwurf öffnen
              </Button>
            ) : (
              <Button
                leftSection={<IconCheck size={16} />}
                onClick={async () => {
                  await setNow({ status: 'complete' });
                  navigate('/clarity');
                }}
              >
                Protokoll abschließen
              </Button>
            )}
          </>
        )}
      </Stack>

      <Group justify="space-between" align="center" className={classes.footer} mt="xl">
        <Button
          variant="subtle"
          color="gray"
          leftSection={<IconArrowLeft size={16} />}
          disabled={step === 0}
          onClick={() => goToStep(step - 1)}
        >
          Zurück
        </Button>

        <Text size="xs" c="dimmed">
          {step + 1} von {THOUGHT_STEPS.length}
        </Text>

        <Button
          variant="light"
          rightSection={<IconArrowRight size={16} />}
          disabled={step === THOUGHT_STEPS.length - 1}
          onClick={() => goToStep(step + 1)}
        >
          Weiter
        </Button>
      </Group>

      <ConfirmDeleteModal
        opened={confirmDelete}
        title="Protokoll löschen"
        description="Dieses Gedankenprotokoll wird von diesem Gerät und vom Pi entfernt."
        onClose={() => setConfirmDelete(false)}
        onConfirm={handleDelete}
      />
    </Container>
  );
}

/**
 * Die eigenen Gedanken als Zitat – der Bezugspunkt der letzten Schritte.
 *
 * Nur Anzeige: geändert wird ein Gedanke dort, wo er entstanden ist. Sonst
 * stünde derselbe Text an drei Stellen zum Bearbeiten, und man wüsste nie,
 * welche Fassung gerade gilt.
 */
function ThoughtsRecap({ thoughts }) {
  const withText = thoughts.filter((thought) => thought.text.trim().length > 0);
  if (withText.length === 0) return null;

  return (
    <Card withBorder radius="md" padding="sm" mb="lg" className={classes.recap}>
      <Stack gap={6}>
        {withText.map((thought) => (
          <Text key={thought.id} size="sm" className={classes.recapLine}>
            {thought.text}
            {thought.beliefBefore != null && (
              <Text span size="xs" c="dimmed">
                {'  '}
                {thought.beliefBefore}
              </Text>
            )}
          </Text>
        ))}
      </Stack>
    </Card>
  );
}

function BackLink() {
  return (
    <Button
      component={Link}
      to="/clarity"
      variant="subtle"
      color="gray"
      size="compact-sm"
      leftSection={<IconArrowLeft size={16} />}
    >
      Klarblick
    </Button>
  );
}
