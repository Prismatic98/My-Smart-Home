/**
 * Vorschläge für das Gefühls-Feld im Gedankenprotokoll.
 *
 * Nur Vorschläge: Freitext bleibt immer möglich. Gespeichert wird
 * ausschließlich das Wort – die Gruppe ist eine Hilfe beim Sortieren dieser
 * Liste und keine Einordnung des Eintrags; sie steht in keinem Datensatz.
 *
 * Angezeigt wird nicht gruppiert, sondern als eine fortlaufende Reihe
 * (EMOTION_LABELS): gruppenweise umbrochen entstanden zwischen den Zeilen
 * unterschiedlich große Lücken. Die Gruppierung bestimmt hier nur noch die
 * Reihenfolge, in der Verwandtes beieinandersteht.
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
