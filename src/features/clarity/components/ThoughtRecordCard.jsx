import { ActionIcon, Badge, Card, Divider, Group, Menu, Stack, Text } from '@mantine/core';
import { IconArrowRight, IconDots, IconPencil, IconTrash } from '@tabler/icons-react';

import { formatDateTime } from '../../../lib/formatDate.js';
import { findDistortion } from '../content/distortions.js';
import { CLARITY_COLOR } from '../lib/appearance.js';
import { summarizeThoughtRecord } from '../lib/thoughtRecord.js';
import classes from './ThoughtRecordCard.module.scss';

/**
 * Ein Gedankenprotokoll in der Übersicht – das Ergebnis in Kurzform.
 *
 * Auf der Kachel steht, was man aus dem Protokoll mitnehmen soll: der Gedanke
 * samt Glaubenswert vorher und jetzt, die Gefühle mit ihren Stärken, die
 * gewählten Denkfehler, die Antwort und der Vorsatz. Wer durch die Liste
 * blättert, liest damit die Erträge und nicht nur Überschriften.
 *
 * Leere Teile fallen weg statt als Lücke dazustehen: ein Entwurf mit drei
 * Zeilen soll nicht wie ein unfertiges Formular aussehen.
 *
 * Zahlen stehen immer als Paar „vorher · jetzt" – **ohne Differenz, ohne
 * Pfeil, ohne Farbe.** Sobald daraus eine Bewegung in eine „richtige"
 * Richtung würde, wäre die Kachel eine Bewertung.
 */
export default function ThoughtRecordCard({ record, onOpen, onDelete }) {
  const summary = summarizeThoughtRecord(record, findDistortion);
  const hasHeadline = summary.headline.length > 0;

  return (
    <Card withBorder radius="md" padding="md" className={classes.card}>
      <Group justify="space-between" align="flex-start" wrap="nowrap" gap="xs">
        <Stack
          gap="sm"
          className={classes.body}
          role="button"
          tabIndex={0}
          onClick={() => onOpen(record)}
          onKeyDown={(event) => {
            if (event.key !== 'Enter' && event.key !== ' ') return;
            event.preventDefault();
            onOpen(record);
          }}
        >
          <div>
            <Group gap={8} align="center" wrap="nowrap" mb={4}>
              <Text size="xs" c="dimmed">
                {formatDateTime(record.situationAt ?? record.createdAt)}
              </Text>
              {summary.isDraft && (
                <Badge size="xs" variant="default">
                  Entwurf
                </Badge>
              )}
            </Group>

            <Text
              fw={600}
              lineClamp={2}
              c={hasHeadline ? undefined : 'dimmed'}
              fs={hasHeadline ? undefined : 'italic'}
              className={classes.headline}
            >
              {hasHeadline ? summary.headline : 'Noch ohne Inhalt'}
            </Text>
          </div>

          {summary.thoughts.length > 0 && (
            <Stack gap={4}>
              {summary.thoughts.slice(0, 2).map((thought) => (
                <div key={thought.id}>
                  <Text size="sm" lineClamp={2} className={classes.thought}>
                    {thought.text}
                  </Text>
                  <ValuePair
                    label="geglaubt"
                    before={thought.beliefBefore}
                    after={thought.beliefAfter}
                  />
                </div>
              ))}
              {summary.thoughts.length > 2 && (
                <Text size="xs" c="dimmed">
                  +{summary.thoughts.length - 2} weitere Gedanken
                </Text>
              )}
            </Stack>
          )}

          {summary.emotions.length > 0 && (
            <Group gap={6} wrap="wrap">
              {summary.emotions.map((emotion) => (
                <Badge
                  key={emotion.id}
                  size="sm"
                  variant="light"
                  color={CLARITY_COLOR}
                  radius="sm"
                  className={classes.emotion}
                >
                  {emotion.label}
                  {emotion.intensityBefore != null && (
                    <span className={classes.emotionValue}>
                      {emotion.intensityBefore}
                      {emotion.intensityAfter != null && ` · ${emotion.intensityAfter}`}
                    </span>
                  )}
                </Badge>
              ))}
            </Group>
          )}

          {summary.distortions.length > 0 && (
            <Group gap={6} wrap="wrap">
              {summary.distortions.map((distortion) => (
                <Badge key={distortion.id} size="xs" variant="outline" color="gray" radius="sm">
                  {distortion.label}
                </Badge>
              ))}
            </Group>
          )}

          {summary.response.length > 0 && (
            <>
              <Divider variant="dashed" />
              <div>
                <Text size="sm" lineClamp={4} className={classes.response}>
                  {summary.response}
                </Text>
                {summary.responseBelief != null && (
                  <Text size="xs" c="dimmed" mt={4}>
                    daran geglaubt: {summary.responseBelief}
                  </Text>
                )}
              </div>
            </>
          )}

          {summary.nextStep.length > 0 && (
            <Group gap={6} wrap="nowrap" align="flex-start" className={classes.nextStep}>
              <IconArrowRight size={15} className={classes.nextStepIcon} />
              <Text size="sm" lineClamp={2}>
                {summary.nextStep}
              </Text>
            </Group>
          )}
        </Stack>

        <Menu position="bottom-end" withinPortal shadow="md">
          <Menu.Target>
            <ActionIcon variant="subtle" color="gray" aria-label="Aktionen für dieses Protokoll">
              <IconDots size={18} />
            </ActionIcon>
          </Menu.Target>
          <Menu.Dropdown>
            <Menu.Item leftSection={<IconPencil size={16} />} onClick={() => onOpen(record)}>
              Öffnen
            </Menu.Item>
            <Menu.Divider />
            <Menu.Item
              color="red"
              leftSection={<IconTrash size={16} />}
              onClick={() => onDelete(record)}
            >
              Löschen
            </Menu.Item>
          </Menu.Dropdown>
        </Menu>
      </Group>
    </Card>
  );
}

/** „geglaubt 85 · jetzt 40" – oder nichts, wenn nichts angegeben wurde. */
function ValuePair({ label, before, after }) {
  if (before == null && after == null) return null;

  return (
    <Text size="xs" c="dimmed" mt={2}>
      {label} {before ?? '—'}
      {after != null && ` · jetzt ${after}`}
    </Text>
  );
}
