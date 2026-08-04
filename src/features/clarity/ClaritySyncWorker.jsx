import { useClaritySync } from './useClaritySync.js';

/**
 * Hält den Klarblick-Sync am Laufen, egal welche Seite gerade offen ist –
 * sonst würde nur synchronisiert, solange man das Modul ansieht.
 *
 * Rendert nichts. Die Seiten des Moduls rufen denselben Hook noch einmal auf,
 * um den Status anzuzeigen; über den gemeinsamen Query-Key ist das dieselbe
 * Query und kein zweiter Durchlauf.
 */
export default function ClaritySyncWorker() {
  useClaritySync();
  return null;
}
