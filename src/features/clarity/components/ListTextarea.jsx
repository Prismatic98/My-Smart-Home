import { forwardRef } from 'react';
import { Textarea } from '@mantine/core';

import { continueBulletList } from '../lib/bulletList.js';

/**
 * Textfeld, das eine Aufzählung fortsetzt.
 *
 * Wer eine Zeile mit „- " beginnt und Enter drückt, bekommt den Strich auf der
 * nächsten Zeile geschenkt; Enter auf einem leeren Aufzählungspunkt beendet
 * die Liste wieder. Genau das erwartet man von einem Feld, in dem man Belege
 * und Gegenbelege untereinander schreibt.
 *
 * **Bewusst keine gerenderten Aufzählungszeichen und kein Rich-Text-Editor.**
 * Der Inhalt eines Protokolls ist reiner Text: er geht so über den Sync, wird
 * so ausgedruckt und lässt sich so vorlesen. Ein zweiter TipTap-Editor wie in
 * den Notizen brächte HTML in die Datensätze und ~430 KB ins Bundle, um
 * Striche runder aussehen zu lassen.
 *
 * Die Schnittstelle weicht bewusst von Mantines `onChange` ab und reicht den
 * fertigen Text durch: das Fortsetzen der Aufzählung entsteht nicht aus einer
 * Tastatureingabe, es gäbe dafür also kein echtes Event weiterzugeben.
 */
const ListTextarea = forwardRef(function ListTextarea({ value, onValueChange, ...props }, ref) {
  function handleKeyDown(event) {
    if (event.key !== 'Enter' || event.shiftKey) return;

    const field = event.currentTarget;
    // Bei markiertem Text ersetzt Enter die Auswahl – da hilft kein Raten.
    if (field.selectionStart !== field.selectionEnd) return;

    const next = continueBulletList(field.value, field.selectionStart);
    if (!next) return;

    event.preventDefault();
    onValueChange(next.text);

    // Den Cursor hinter das Eingefügte setzen. Muss nach dem Rendern
    // passieren, sonst steht er wieder am alten Platz.
    requestAnimationFrame(() => field.setSelectionRange(next.caret, next.caret));
  }

  return (
    <Textarea
      {...props}
      ref={ref}
      value={value}
      onChange={(event) => onValueChange(event.currentTarget.value)}
      onKeyDown={handleKeyDown}
      autosize
    />
  );
});

export default ListTextarea;
