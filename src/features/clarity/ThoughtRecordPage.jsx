import { useState } from 'react';
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
import ResponseQuestions from './components/ResponseQuestions.jsx';
import RichTextField from './components/RichTextField.jsx';
import RichTextView from './components/RichTextView.jsx';
import ScaleSlider from './components/ScaleSlider.jsx';
import StepBar from './components/StepBar.jsx';
import ThoughtsEditor from './components/ThoughtsEditor.jsx';
import { HELP_TEXTS } from './content/prompts.js';
import { CLARITY_COLOR } from './lib/appearance.js';
import { isRichTextEmpty } from './lib/richText.js';
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

  const step = clampStepIndex(Number(params.get('schritt') ?? '1') - 1);

  function goToStep(index) {
    flush();
    setParams({ schritt: String(clampStepIndex(index) + 1) });
    window.scrollTo({ top: 0 });
  }

  async function handleDelete() {
    await deleteRecord('thoughtRecords', recordId);
    setConfirmDelete(false);
    navigate('/clarity/thoughts', { replace: true });
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

  return (
    <Container size="sm" px={0} className={classes.page}>
      <Group justify="space-between" align="center" wrap="nowrap" mb="sm">
        <BackLink />

        <Group gap="xs" wrap="nowrap">
          {complete && (
            <Badge variant="light" color={CLARITY_COLOR} size="sm">
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

      {/* Der Abstand nach unten hält den Inhalt von der Fußleiste frei, die
          fest am unteren Rand klebt. */}
      <Stack gap="lg" pb="xl">
        {current.key === 'situation' && (
          <>
            <RichTextField
              label="Die Situation"
              placeholder="Wo, mit wem, was ist geschehen — so, wie du es jemandem erzählen würdest"
              value={draft.situation ?? ''}
              onValueChange={(text) => set({ situation: text })}
              onBlur={flush}
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

            <RichTextField
              label="Hat dein Körper etwas gemacht?"
              description="Herzklopfen, Wärme im Gesicht, enger Hals — wenn dir etwas aufgefallen ist."
              value={draft.bodySensations ?? ''}
              onValueChange={(text) => set({ bodySensations: text })}
              onBlur={flush}
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
            <ResponseQuestions
              answers={draft.responseAnswers ?? {}}
              onChange={(next) => set({ responseAnswers: next })}
              onBlur={flush}
            />

            <RichTextField
              label="Und zusammengenommen?"
              description={HELP_TEXTS.response}
              value={draft.response ?? ''}
              onValueChange={(text) => set({ response: text })}
              onBlur={flush}
              minRows={4}
            />

            <ScaleSlider
              label="Wie sehr glaube ich dieser Antwort?"
              value={draft.responseBelief}
              onChange={(value) => setNow({ responseBelief: value })}
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

            <RichTextField
              label="Was tue ich jetzt?"
              description="Was du dir vornimmst — oder schon getan hast."
              value={draft.nextStep ?? ''}
              onValueChange={(text) => set({ nextStep: text })}
              onBlur={flush}
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
                color={CLARITY_COLOR}
                leftSection={<IconCheck size={16} />}
                onClick={async () => {
                  await setNow({ status: 'complete' });
                  navigate('/clarity/thoughts');
                }}
              >
                Protokoll abschließen
              </Button>
            )}
          </>
        )}
      </Stack>

      {/* Klebt am unteren Bildschirmrand, damit Blättern immer mit dem Daumen
          erreichbar ist – auch mitten in einem langen Schritt. */}
      <Group justify="space-between" align="center" className={classes.footer}>
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
          color={CLARITY_COLOR}
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
  const withText = thoughts.filter((thought) => !isRichTextEmpty(thought.text));
  if (withText.length === 0) return null;

  return (
    <Card withBorder radius="md" padding="md" mb="lg" className={classes.recap}>
      {/* Luft zwischen den Zitaten: dicht untereinander verschwimmen zwei
          Gedanken zu einem Absatz, und genau das sollen sie nicht. */}
      <Stack gap="md">
        {withText.map((thought) => (
          <div key={thought.id} className={classes.recapLine}>
            <RichTextView value={thought.text} />
            {thought.beliefBefore != null && (
              <Text size="xs" c="dimmed" mt={4}>
                geglaubt {thought.beliefBefore}
              </Text>
            )}
          </div>
        ))}
      </Stack>
    </Card>
  );
}

function BackLink() {
  return (
    <Button
      component={Link}
      to="/clarity/thoughts"
      variant="subtle"
      color="gray"
      size="compact-sm"
      leftSection={<IconArrowLeft size={16} />}
    >
      Gedankenprotokoll
    </Button>
  );
}
