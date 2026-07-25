import { useLiveQuery } from 'dexie-react-hooks';

import { getNote, listNotes } from './notesRepository.js';

/**
 * Lesen läuft über useLiveQuery: Dexie beobachtet die Tabelle und rendert die
 * Komponente nach jedem Schreibvorgang neu – auch, wenn dieser aus einem
 * anderen Browser-Tab kam. Deshalb brauchen die Mutationen keinerlei
 * Cache-Invalidierung; sie schreiben nur.
 *
 * Schreiben geht direkt über die (re-exportierten) Repository-Funktionen.
 */
export { createNote, updateNote, deleteNote } from './notesRepository.js';

/**
 * Alle Notizen, zuletzt bearbeitete zuerst.
 * `notes` ist undefined, solange die erste Abfrage läuft – daraus leitet sich
 * `isLoading` ab (wichtig, um "lädt noch" nicht als "keine Notizen" zu zeigen).
 */
export function useNotes() {
  const notes = useLiveQuery(() => listNotes(), []);
  return { notes: notes ?? [], isLoading: notes === undefined };
}

/** Eine einzelne Notiz, reaktiv. */
export function useNote(id) {
  const note = useLiveQuery(() => (id ? getNote(id) : undefined), [id]);
  return { note, isLoading: id ? note === undefined : false };
}