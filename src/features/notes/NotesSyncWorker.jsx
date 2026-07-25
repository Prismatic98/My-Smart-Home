import { useNotesSync } from './useNotesSync.js';

/**
 * Hält den Notizen-Sync am Laufen, egal welche Seite gerade offen ist –
 * sonst würde nur synchronisiert, solange man die Notizen-Seite ansieht.
 *
 * Rendert nichts. Die Notizen-Seite ruft denselben Hook noch einmal auf, um
 * den Status anzuzeigen; über den gemeinsamen Query-Key ist das dieselbe
 * Query und kein zweiter Durchlauf.
 */
export default function NotesSyncWorker() {
  useNotesSync();
  return null;
}
