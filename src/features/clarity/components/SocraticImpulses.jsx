import { useState } from 'react';
import { Button, Collapse, Stack, Text, UnstyledButton } from '@mantine/core';
import { IconChevronDown } from '@tabler/icons-react';

import { RESPONSE_QUESTIONS } from '../content/prompts.js';
import classes from './SocraticImpulses.module.scss';

/**
 * Die Hilfsfragen als Anregung, nicht als Formular.
 *
 * Auf dem Arbeitsblatt stehen sie klein unter der Tabelle – erreichbar, wenn
 * man sie braucht, und sonst im Weg. Hier entspricht dem: eingeklappt, und
 * ein Antippen setzt die Frage als Zwischenüberschrift in das Textfeld
 * darüber. Beantwortet wird darunter, im eigenen Wortlaut.
 *
 * Ein Feld je Frage wäre eine Pflichtübung mit sechs Kästchen, von denen man
 * vier leer lässt und deshalb das Gefühl hat, etwas nicht geschafft zu haben.
 * Das Blatt hat dafür auch nur eine Spalte.
 *
 * Achtung Mantine v9: die Prop von Collapse heißt `expanded`, nicht `in`.
 * Mit `in` bleibt der Bereich für immer zu, ohne dass Build oder Lint etwas
 * merken.
 */
export default function SocraticImpulses({ onInsert }) {
  const [opened, setOpened] = useState(false);

  return (
    <div>
      <UnstyledButton
        onClick={() => setOpened((current) => !current)}
        className={classes.toggle}
        aria-expanded={opened}
      >
        <Text size="sm" c="dimmed">
          Fragen, die weiterhelfen können
        </Text>
        <IconChevronDown size={16} className={classes.chevron} data-opened={opened || undefined} />
      </UnstyledButton>

      <Collapse expanded={opened}>
        <Stack gap={6} pt="xs">
          {RESPONSE_QUESTIONS.map((question) => (
            <Button
              key={question}
              variant="subtle"
              color="gray"
              size="compact-sm"
              justify="flex-start"
              className={classes.question}
              onClick={() => onInsert(question)}
            >
              {question}
            </Button>
          ))}
        </Stack>
      </Collapse>
    </div>
  );
}
