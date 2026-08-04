/**
 * Vorschläge für das Gefühls-Feld im Gedankenprotokoll.
 *
 * Nur Vorschläge: Freitext bleibt immer möglich. Angezeigt wird gruppiert,
 * gespeichert wird ausschließlich das Label – die Gruppe ist eine Hilfe beim
 * Finden und keine Einordnung des Eintrags.
 */
export const EMOTION_GROUPS = [
  { group: 'Angst', labels: ['ängstlich', 'nervös', 'angespannt', 'panisch', 'unruhig'] },
  { group: 'Scham', labels: ['beschämt', 'peinlich berührt', 'bloßgestellt', 'verlegen'] },
  { group: 'Traurig', labels: ['traurig', 'niedergeschlagen', 'enttäuscht', 'einsam', 'leer'] },
  { group: 'Ärger', labels: ['verärgert', 'gereizt', 'wütend', 'frustriert'] },
  { group: 'Schuld', labels: ['schuldig', 'unzulänglich'] },
  {
    group: 'Sonstige',
    labels: ['überfordert', 'hilflos', 'erleichtert', 'hoffnungsvoll', 'stolz', 'ruhig'],
  },
];

/** Alle Vorschläge als flache Liste, in der Reihenfolge der Gruppen. */
export const EMOTION_LABELS = EMOTION_GROUPS.flatMap((entry) => entry.labels);
