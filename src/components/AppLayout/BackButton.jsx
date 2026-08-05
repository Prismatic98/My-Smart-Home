import { useLocation, useNavigate } from 'react-router-dom';
import { ActionIcon } from '@mantine/core';
import { IconArrowLeft } from '@tabler/icons-react';

import { parentPath } from '../../lib/backTarget.js';

/**
 * Zurück-Pfeil im Header – auf jeder Seite außer der Übersicht.
 *
 * Er verhält sich wie die Zurück-Taste des Handys und geht damit auch die
 * Zustände mit, die absichtlich in der URL stehen (`?schritt=` im
 * Gedankenprotokoll, `?preview=` in der Dateiablage): ein Pfeil, der etwas
 * anderes täte als die Systemtaste daneben, wäre nicht vorhersagbar.
 *
 * Ohne Verlauf – Deep-Link, geteilte Datei, frisch geöffnete PWA – gibt es
 * nichts zurückzugehen, und `navigate(-1)` verließe die App. Dann geht es
 * stattdessen ein Segment nach oben, und zwar per `replace`: sonst schöbe der
 * Sprung einen Eintrag auf den Stapel, den der nächste Klick als Verlauf
 * ansähe – man liefe zwischen zwei Seiten hin und her.
 */
export default function BackButton() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  function goBack() {
    // React Router zählt die Einträge dieser Sitzung in `history.state.idx`.
    // Erst im Klick gelesen, weil sich der Wert mit jeder Navigation ändert.
    if ((window.history.state?.idx ?? 0) > 0) {
      navigate(-1);
      return;
    }
    navigate(parentPath(pathname), { replace: true });
  }

  return (
    <ActionIcon variant="subtle" size="lg" radius="md" aria-label="Zurück" onClick={goBack}>
      <IconArrowLeft size={20} />
    </ActionIcon>
  );
}
