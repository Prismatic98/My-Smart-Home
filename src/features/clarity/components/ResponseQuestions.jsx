import { Card, Stack, Text } from '@mantine/core';

import { RESPONSE_QUESTIONS } from '../content/prompts.js';
import ListTextarea from './ListTextarea.jsx';
import classes from './ResponseQuestions.module.scss';

/**
 * Die sechs Hilfsfragen, jede mit eigenem Feld.
 *
 * Vorher standen sie eingeklappt als Anregung über einem einzigen Textfeld –
 * das führte dazu, dass zwei beantwortet wurden und vier nie. Sie sind aber
 * die eigentliche Arbeit dieses Schrittes: der Gedanke wird nicht dadurch
 * geprüft, dass man ihm widerspricht, sondern dadurch, dass man ihn diesen
 * sechs Fragen aussetzt.
 *
 * Jedes Feld setzt Aufzählungen fort (ListTextarea) – bei „was spricht dafür,
 * was dagegen" schreibt man untereinander und nicht in Sätzen.
 *
 * Es gibt **keine Pflichtangabe und keine Zählung**, wie viele beantwortet
 * sind. Sichtbar nebeneinander zu stehen genügt; eine App, die vollständige
 * Bearbeitung anmahnt, ist genau die Instanz, vor der man bestehen muss.
 */
export default function ResponseQuestions({ answers = {}, onChange, onBlur }) {
  return (
    <Stack gap="md">
      {RESPONSE_QUESTIONS.map((question, index) => (
        <Card key={question.id} withBorder radius="md" padding="md" className={classes.card}>
          <Text size="sm" fw={500} mb={8} className={classes.question}>
            <span className={classes.number}>{index + 1}</span>
            {question.text}
          </Text>

          <ListTextarea
            value={answers[question.id] ?? ''}
            onValueChange={(text) => onChange({ ...answers, [question.id]: text })}
            onBlur={onBlur}
            placeholder="…"
            minRows={2}
            aria-label={question.text}
          />
        </Card>
      ))}
    </Stack>
  );
}
