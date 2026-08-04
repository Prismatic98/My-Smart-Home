import { useCallback, useEffect, useRef, useState } from 'react';

import { updateRecord } from './clarityRepository.js';
import { useRecord } from './useClarity.js';

/**
 * Bearbeitungsstand eines Datensatzes mit Sicherung im Hintergrund.
 *
 * Warum überhaupt ein Zwischenspeicher, wo die App sonst direkt nach Dexie
 * schreibt: ein Gedankenprotokoll besteht aus langen Freitextfeldern. Ein
 * Schreibvorgang je Tastendruck hieße, dass ein halber Satz als eigener
 * Datenstand in der Datenbank steht und `updatedAt` sekündlich hochzählt – und
 * damit auch der Abgleich sekündlich etwas zu tun bekäme.
 *
 * Deshalb: die Eingabe läuft gegen den lokalen Stand, geschrieben wird
 * gesammelt. Ausgelöst wird das Schreiben durch
 *  - eine kurze Pause beim Tippen,
 *  - jeden Schrittwechsel und jedes Verlassen der Seite,
 *  - das Loslassen eines Reglers (über `setNow`),
 *  - und das Wegwischen der App (`visibilitychange`) – auf dem Handy ist das
 *    der häufigste Weg, eine Eingabe zu verlassen, und der einzige, bei dem
 *    React nichts mehr mitbekommt.
 *
 * Es gibt bewusst kein Abbrechen: ein Protokoll schreibt man in mehreren
 * Anläufen, und wer die Zurück-Taste drückt, will fortsetzen und nicht
 * verwerfen. Dieselbe Entscheidung wie beim Listen-Editor der Notizen.
 */

/** Tippause, nach der gesichert wird. */
const AUTOSAVE_DELAY = 1200;

export function useRecordDraft(table, id) {
  const { record } = useRecord(table, id);

  const [draft, setDraft] = useState(null);
  const draftRef = useRef(null);
  const pendingRef = useRef({});
  const loadedRef = useRef(null);
  const timerRef = useRef(null);

  /**
   * Schreibt die aufgelaufenen Änderungen.
   *
   * Die Merkliste wird vor dem Schreiben geleert, damit parallele Eingaben
   * nicht in denselben Schwung geraten und dabei verloren gehen.
   */
  const flush = useCallback(async () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    const changes = pendingRef.current;
    pendingRef.current = {};
    if (Object.keys(changes).length === 0) return;

    try {
      await updateRecord(table, id, changes);
    } catch {
      // Der Datensatz kann zwischenzeitlich gelöscht worden sein – etwa vom
      // Abgleich, weil er auf einem anderen Gerät weggeräumt wurde. Dann ist
      // Nichtstun richtig: die Löschung ist die jüngere Aussage.
    }
  }, [table, id]);

  /** Ändert den lokalen Stand und meldet die Felder zum Sichern an. */
  const set = useCallback(
    (changes) => {
      draftRef.current = { ...draftRef.current, ...changes };
      pendingRef.current = { ...pendingRef.current, ...changes };
      setDraft(draftRef.current);

      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        flush();
      }, AUTOSAVE_DELAY);
    },
    [flush]
  );

  /** Ändert und sichert sofort – für Regler, Haken und Auswahlen. */
  const setNow = useCallback(
    (changes) => {
      set(changes);
      return flush();
    },
    [set, flush]
  );

  // Erstbefüllung. Danach führt der lokale Stand: käme jede Änderung aus der
  // Datenbank zurück in den Editor, überschriebe der eigene gesicherte Stand
  // die Zeichen, die währenddessen getippt wurden.
  useEffect(() => {
    if (!record) return;
    if (loadedRef.current === record.id) return;

    loadedRef.current = record.id;
    pendingRef.current = {};
    draftRef.current = record;
    setDraft(record);
  }, [record]);

  // Anderer Datensatz: alles zurücksetzen, vorher aber das Angefangene sichern.
  useEffect(() => {
    return () => {
      flush();
      loadedRef.current = null;
      draftRef.current = null;
      setDraft(null);
    };
  }, [flush]);

  // Wegwischen, Bildschirm aus, Tab-Wechsel: der letzte Moment, in dem noch
  // etwas geschrieben werden kann. 'hidden' ist auf Android der verlässliche
  // Zeitpunkt, 'beforeunload' feuert dort nicht.
  useEffect(() => {
    const handler = () => {
      if (document.visibilityState === 'hidden') flush();
    };
    document.addEventListener('visibilitychange', handler);
    window.addEventListener('pagehide', handler);
    return () => {
      document.removeEventListener('visibilitychange', handler);
      window.removeEventListener('pagehide', handler);
    };
  }, [flush]);

  return {
    /** Der Stand, den die Eingabefelder anzeigen – null, solange geladen wird. */
    draft,
    /** true, solange der Datensatz noch nicht da ist. */
    isLoading: record === undefined,
    /** true, wenn es den Datensatz nicht (mehr) gibt oder er gelöscht wurde. */
    missing: record === null || (record != null && record.deletedAt != null),
    set,
    setNow,
    flush,
  };
}
