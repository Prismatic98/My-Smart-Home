import { Group, UnstyledButton } from '@mantine/core';

import { THOUGHT_STEPS, stepHasContent } from '../lib/thoughtRecord.js';
import classes from './StepBar.module.scss';

/**
 * Die Schrittleiste des Gedankenprotokolls – die Spalten des Arbeitsblattes,
 * nebeneinander.
 *
 * Auf dem Handy trägt nur der aktuelle Schritt seinen Namen, die übrigen sind
 * Nummern; ab Tablettbreite stehen alle sechs Namen da. Sechs Beschriftungen
 * nebeneinander passen auf kein Handydisplay, und eine waagerecht scrollende
 * Leiste versteckt genau die Schritte, zu denen man springen will.
 *
 * Ein ausgefüllter Punkt heißt „hier steht schon etwas". Das ist eine
 * Wiederfindehilfe und **kein Fortschritt**: es wird nichts gezählt, nichts
 * in Prozent umgerechnet und nichts angemahnt. Ein Protokoll, in dem nur die
 * ersten drei Schritte stehen, ist ein vollständiges Protokoll für das, was
 * man in der Bahn festhalten konnte.
 */
export default function StepBar({ current, record, onSelect }) {
  return (
    <Group gap={2} justify="center" wrap="nowrap" className={classes.bar}>
      {THOUGHT_STEPS.map((entry, index) => (
        <UnstyledButton
          key={entry.key}
          onClick={() => onSelect(index)}
          className={classes.step}
          data-current={index === current || undefined}
          data-filled={stepHasContent(entry.key, record) || undefined}
          aria-label={`Schritt ${index + 1} von ${THOUGHT_STEPS.length}: ${entry.label}`}
          aria-current={index === current ? 'step' : undefined}
        >
          <span className={classes.marker}>{index + 1}</span>
          <span className={classes.label}>{entry.label}</span>
        </UnstyledButton>
      ))}
    </Group>
  );
}
