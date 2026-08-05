import { ActionIcon, Badge, Card, Group, Menu, Stack, Text, ThemeIcon } from '@mantine/core';
import { IconArrowRight, IconDots, IconPencil, IconTrash } from '@tabler/icons-react';

import { formatDateTime } from '../../../lib/formatDate.js';
import { CLARITY_COLOR } from '../lib/appearance.js';
import { summarizeThoughtRecord } from '../lib/thoughtRecord.js';
import BeforeAfter from './BeforeAfter.jsx';
import RichTextView from './RichTextView.jsx';
import classes from './ThoughtRecordCard.module.scss';

/**
 * Ein Gedankenprotokoll in der Übersicht.
 *
 * Auf der Kachel stehen genau drei Dinge, und jedes ungekürzt: **die
 * Situation** als Überschrift, **die automatischen Gedanken** samt Glaubenswert
 * vorher und nachher, und **was ich jetzt tue**.
 *
 * Die Reihenfolge ist die des Protokolls – erst worum es ging, dann was einem
 * durch den Kopf ging, dann was daraus folgt. **Der Vorsatz steht am Ende und
 * ist trotzdem das Auffälligste auf der Karte:** er ist das, was in den
 * nächsten Tag geht, alles darüber ist der Weg dorthin. Dafür sorgen kräftiger
 * Rand, gefülltes Zeichen und größere Schrift, nicht die Position.
 *
 * Gefühle, Denkfehler und die Antwort auf den Gedanken standen hier auch schon
 * und sind bewusst wieder raus: eine Kachel, die alle sechs Schritte wiedergibt,
 * ist keine Übersicht mehr. Wer die Einzelheiten braucht, öffnet das Protokoll.
 *
 * Die beiden Glaubenswerte sind hervorgehoben, aber **hervorgehoben heißt
 * sichtbar, nicht bewertet**: dieselben zwei Plaketten wie im Editor
 * (BeforeAfter), nur eine Stufe größer. Keine Differenz und keine Farbe, die
 * von der Zahl abhängt; der Pfeil dazwischen zeigt die Zeitfolge und liegt
 * immer gleich.
 */
export default function ThoughtRecordCard({ record, onOpen, onDelete }) {
  const summary = summarizeThoughtRecord(record);
  const empty =
    summary.situation.length === 0 && summary.thoughts.length === 0 && summary.nextStep.length === 0;

  return (
    <Card withBorder radius="md" padding="md" className={classes.card}>
      {/* Das Menü sitzt in der Kopfzeile und nicht in einer eigenen Spalte
          daneben: sonst wäre der ganze Inhalt darunter um seine Breite
          eingerückt, obwohl dort nichts steht. */}
      <Stack
        gap="md"
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
        <Group justify="space-between" align="center" wrap="nowrap" gap="xs">
          <Group gap={8} align="center" wrap="nowrap">
            <Text size="xs" c="dimmed">
              {formatDateTime(record.situationAt ?? record.createdAt)}
            </Text>
            {summary.isDraft && (
              <Badge size="xs" variant="default">
                Entwurf
              </Badge>
            )}
          </Group>

          {/* Das Menü liegt in der anklickbaren Fläche der Karte. Ohne das
              Anhalten des Ereignisses öffnete jeder Griff zum Menü zugleich
              das Protokoll. */}
          <Menu position="bottom-end" withinPortal shadow="md">
            <Menu.Target>
              <ActionIcon
                variant="subtle"
                color="gray"
                aria-label="Aktionen für dieses Protokoll"
                className={classes.menuButton}
                onClick={(event) => event.stopPropagation()}
                onKeyDown={(event) => event.stopPropagation()}
              >
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

        {empty && (
          <Text size="sm" c="dimmed" fs="italic">
            Noch ohne Inhalt
          </Text>
        )}

        {/* Die Situation ist die Überschrift der Karte – sie sagt, worum es
            ging, und macht ein Protokoll wiedererkennbar. Ungekürzt bleibt
            sie trotzdem. */}
        {summary.situation.length > 0 && (
          <RichTextView value={summary.situation} size="md" className={classes.situation} />
        )}

        {summary.thoughts.length > 0 && (
          <Stack gap="md">
            {summary.thoughts.map((thought) => (
              <div key={thought.id} className={classes.thought}>
                <RichTextView value={thought.text} className={classes.thoughtText} />
                <BeforeAfter
                  before={thought.beliefBefore}
                  after={thought.beliefAfter}
                  size="lg"
                  mt={8}
                />
              </div>
            ))}
          </Stack>
        )}

        {summary.nextStep.length > 0 && (
          <div className={classes.nextStep}>
            <Group gap={8} wrap="nowrap" mb={6}>
              <ThemeIcon size={24} radius="xl" color={CLARITY_COLOR} variant="filled">
                <IconArrowRight size={15} />
              </ThemeIcon>
              <Text size="xs" fw={700} tt="uppercase" className={classes.nextStepLabel}>
                Was ich jetzt tue
              </Text>
            </Group>
            <RichTextView value={summary.nextStep} size="md" className={classes.nextStepText} />
          </div>
        )}
      </Stack>
    </Card>
  );
}
