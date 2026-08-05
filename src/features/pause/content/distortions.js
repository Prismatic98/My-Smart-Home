/**
 * Katalog der Denkfehler.
 *
 * Steht bewusst als Konstante im Code und NICHT in der Datenbank: das ist ein
 * Nachschlagewerk, keine Nutzerdaten. Es wird nie synchronisiert, nie
 * bearbeitet und braucht keine Tombstones.
 *
 * Auswahl, Reihenfolge und Nummerierung folgen dem Blatt „Systematische
 * Denkfehler" aus der Sitzung (Beck). Die Beschreibungen sind eigenständig
 * formuliert und in der Du-Form der App gehalten; die Methode ist
 * Fachallgemeingut, der Wortlaut des Blattes nicht.
 *
 * `id` wird in thoughtRecords.distortionIds gespeichert und darf sich deshalb
 * nie ändern. IDs, die es nicht mehr gibt (früher `fortune_telling`, jetzt Teil
 * von `catastrophising`, und `unfair_comparison`), bleiben in alten
 * Datensätzen stehen und werden von findDistortion() still übergangen.
 *
 * Die Klammerzusätze des Blattes („auch Schwarz-Weiß-Denken", „Imperative" …)
 * stehen hier nicht: sie benennen dasselbe noch einmal in Fachsprache und
 * verlängern jeden Eintrag um eine Zeile, die niemand braucht.
 *
 * Zu jedem Eintrag gehört eine Frage und keine Handlungsanweisung.
 */
export const DISTORTIONS = [
  {
    id: 'all_or_nothing',
    label: 'Alles-oder-nichts-Denken',
    description:
      'Du siehst eine Situation nicht als Übergang mit vielen Zwischenstufen, sondern nur in zwei Kategorien.',
    example: '„Wenn ich nicht total erfolgreich bin, bin ich ein Versager."',
    question: 'Wo genau zwischen 0 und 100 lag es wirklich?',
  },
  {
    id: 'catastrophising',
    label: 'Katastrophisieren',
    description:
      'Du sagst für die Zukunft etwas Negatives voraus, ohne andere, wahrscheinlichere Folgen in Betracht zu ziehen.',
    example: '„Vor lauter Aufregung werde ich gar nichts machen können."',
    question:
      'Wie oft ist diese Vorhersage bisher eingetroffen — und was wäre der wahrscheinlichere Ausgang?',
  },
  {
    id: 'discounting_positive',
    label: 'Positives ausschließen oder abwerten',
    description:
      'Du sagst dir ohne guten Grund, dass positive Erfahrungen, Taten oder Eigenschaften nicht zählen.',
    example:
      '„Dieses Projekt ist mir gut gelungen, aber das heißt nicht, dass ich qualifiziert bin; ich hatte einfach Glück."',
    question: 'Würde ich diese Erklärung auch bei jemand anderem gelten lassen?',
  },
  {
    id: 'emotional_reasoning',
    label: 'Gefühl als Beweis',
    description:
      'Du hältst etwas für wahr, weil du es so stark fühlst — in Wirklichkeit glaubst — und wertest Belege für das Gegenteil ab oder übergehst sie.',
    example:
      '„Ich weiß, dass ich bei der Arbeit vieles gut mache, aber ich habe trotzdem das Gefühl, ein Versager zu sein."',
    question: 'Welche Belege gäbe es außer meinem Gefühl?',
  },
  {
    id: 'labelling',
    label: 'Etikettierung',
    description:
      'Du gibst dir selbst oder anderen ein festes, umfassendes Etikett und lässt dabei alles außer Acht, was zu einer weniger extremen Schlussfolgerung führen würde.',
    example: '„Ich bin ein Versager." „Er taugt nichts."',
    question: 'Wie würde ich dasselbe beschreiben, wenn ich nur über das Verhalten spräche?',
  },
  {
    id: 'magnifying',
    label: 'Vergrößerung / Verkleinerung',
    description:
      'Wenn du dich selbst, andere oder eine Situation beurteilst, fallen die negativen Anteile ohne guten Grund größer und die positiven kleiner aus, als sie sind.',
    example:
      '„Eine mittelmäßige Beurteilung beweist, wie unzulänglich ich bin. Gute Noten bedeuten nicht, dass ich schlau bin."',
    question: 'Welches Gewicht hätte beides, wenn es jemand anderem passiert wäre?',
  },
  {
    id: 'mental_filter',
    label: 'Mentaler Filter',
    description:
      'Statt das vollständige Bild zu sehen, richtest du deine Aufmerksamkeit übermäßig auf ein einzelnes negatives Detail.',
    example:
      '„In meiner Beurteilung steht eine negative Bewertung (neben einer positiven). Das bedeutet, dass ich schlechte Arbeit mache."',
    question: 'Was ist in derselben Situation noch passiert, das ich gerade ausblende?',
  },
  {
    id: 'mind_reading',
    label: 'Gedankenlesen',
    description:
      'Du glaubst zu wissen, was andere denken, und ziehst dabei andere, wahrscheinlichere Möglichkeiten nicht in Betracht.',
    example: '„Er denkt, dass ich nicht den leisesten Schimmer von diesem Projekt habe."',
    question: 'Woran genau mache ich das fest — und welche anderen Erklärungen gäbe es dafür?',
  },
  {
    id: 'overgeneralisation',
    label: 'Übergeneralisieren',
    description:
      'Du ziehst eine radikale negative Schlussfolgerung, die weit über die aktuelle Situation hinausgeht.',
    example:
      '„Ich habe einfach kein Talent, Freunde zu finden." (weil ich mich bei dem Treffen nicht wohl gefühlt habe)',
    question: 'Wie oft ist es tatsächlich so gelaufen — und wie oft anders?',
  },
  {
    id: 'personalisation',
    label: 'Personalisierung',
    description:
      'Du glaubst, dass es an dir liegt, wenn andere sich negativ verhalten, ohne naheliegendere Erklärungen für ihr Verhalten in Betracht zu ziehen.',
    example: '„Der Mechaniker war kurz angebunden zu mir, weil ich etwas falsch gemacht habe."',
    question: 'Welche anderen Gründe könnte es geben, die nichts mit mir zu tun haben?',
  },
  {
    id: 'should_statements',
    label: 'Aussagen mit „sollte" und „müsste"',
    description:
      'Du hast eine genaue, feste Vorstellung davon, wie du oder andere sich verhalten sollten, und überschätzt, wie schlimm es ist, wenn diese Erwartung nicht erfüllt wird.',
    example: '„Es ist schrecklich, dass ich einen Fehler gemacht habe. Ich sollte immer mein Bestes geben."',
    question:
      'Wer hat diese Regel aufgestellt, und was würde tatsächlich passieren, wenn ich sie nicht erfülle?',
  },
  {
    id: 'tunnel_vision',
    label: 'Tunnelblick',
    description: 'Du siehst nur die negativen Aspekte einer Situation.',
    example:
      '„Der Lehrer meines Sohnes kann nichts richtig machen. Er ist zu kritisch und unsensibel und ein miserabler Pädagoge."',
    question: 'Was gehörte noch dazu, das ich gerade nicht mitzähle?',
  },
];

/** Schneller Zugriff auf einen Eintrag über seine gespeicherte ID. */
const BY_ID = new Map(DISTORTIONS.map((entry) => [entry.id, entry]));

/**
 * Ein Katalogeintrag oder undefined.
 *
 * Gespeicherte IDs können auf Einträge zeigen, die es nicht mehr gibt (etwa
 * nach einem Rückbau des Katalogs). Aufrufer müssen deshalb mit undefined
 * rechnen und dürfen einen unbekannten Eintrag nicht als Fehler behandeln.
 */
export function findDistortion(id) {
  return BY_ID.get(id);
}
