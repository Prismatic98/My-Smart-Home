/**
 * Katalog der Denkfehler.
 *
 * Steht bewusst als Konstante im Code und NICHT in der Datenbank: das ist ein
 * Nachschlagewerk, keine Nutzerdaten. Es wird nie synchronisiert, nie
 * bearbeitet und braucht keine Tombstones.
 *
 * Die Texte sind eigenständig formuliert (siehe docs/clarity-fachliche-grundlagen.md).
 * Der Wortlaut geschützter Arbeitsblätter darf hier nicht landen – die Methode
 * ist Fachallgemeingut, die Formulierung nicht.
 *
 * `id` wird in thoughtRecords.distortionIds gespeichert und darf sich deshalb
 * nie ändern.
 */
export const DISTORTIONS = [
  {
    id: 'all_or_nothing',
    label: 'Alles oder nichts',
    description:
      'Zwischentöne fallen weg. Etwas ist entweder gelungen oder gescheitert, jemand ist entweder auf meiner Seite oder gegen mich.',
    example: '„Ich habe mich einmal verhaspelt — der ganze Vortrag war eine Katastrophe."',
    question: 'Wo genau zwischen 0 und 100 lag es wirklich?',
  },
  {
    id: 'overgeneralisation',
    label: 'Übergeneralisierung',
    description:
      'Aus einem einzelnen Ereignis wird eine allgemeine Regel. Erkennbar an Wörtern wie immer, nie, jedes Mal, ständig.',
    example: '„Das Gespräch lief zäh. Ich kann einfach keinen Smalltalk."',
    question: 'Wie oft ist es tatsächlich so gelaufen — und wie oft anders?',
  },
  {
    id: 'mental_filter',
    label: 'Negativfilter',
    description:
      'Aus einer Situation bleibt nur das Ungünstige hängen. Der Rest verschwindet, obwohl er stattgefunden hat.',
    example:
      '„Zwölf Leute haben genickt, einer hat aufs Handy geschaut. An den einen denke ich den ganzen Abend."',
    question: 'Was ist in derselben Situation noch passiert, das ich gerade ausblende?',
  },
  {
    id: 'discounting_positive',
    label: 'Positives abwerten',
    description:
      'Gelungenes zählt nicht, weil es wegerklärt wird — es war Zufall, Höflichkeit oder ohnehin selbstverständlich.',
    example: '„Sie hat gelacht, aber nur um mir nicht das Gefühl zu geben, dass es unangenehm war."',
    question: 'Würde ich diese Erklärung auch bei jemand anderem gelten lassen?',
  },
  {
    id: 'mind_reading',
    label: 'Gedankenlesen',
    description:
      'Ich bin sicher zu wissen, was andere über mich denken, ohne dass sie es gesagt haben.',
    example: '„Er findet mich anstrengend."',
    question: 'Woran genau mache ich das fest — und welche anderen Erklärungen gäbe es dafür?',
  },
  {
    id: 'fortune_telling',
    label: 'Zukunft vorhersagen',
    description:
      'Ich behandle eine Vermutung über die Zukunft wie eine feststehende Tatsache, fast immer eine ungünstige.',
    example: '„Auf der Feier werde ich niemanden zum Reden finden."',
    question: 'Wie oft ist diese Vorhersage bisher eingetroffen?',
  },
  {
    id: 'catastrophising',
    label: 'Katastrophisieren',
    description:
      'Der schlimmstmögliche Ausgang gilt als der wahrscheinliche — und als etwas, das ich nicht aushalten würde.',
    example: '„Wenn ich rot werde, ist die Situation nicht mehr zu retten."',
    question:
      'Was ist das Schlimmste, was Realistischste, und wie käme ich mit dem Schlimmsten zurecht?',
  },
  {
    id: 'emotional_reasoning',
    label: 'Gefühl als Beweis',
    description:
      'Weil sich etwas so anfühlt, muss es auch so sein. Das Gefühl wird zum Beleg für eine Tatsache.',
    example: '„Ich fühle mich unsicher, also wirke ich unsicher."',
    question: 'Welche Belege gäbe es außer meinem Gefühl?',
  },
  {
    id: 'should_statements',
    label: 'Muss-Sätze',
    description:
      'Starre Regeln darüber, wie ich oder andere zu sein haben. Sie erzeugen Druck, und ihre Verletzung erzeugt Scham oder Ärger.',
    example: '„Ich muss immer etwas Kluges beizutragen haben."',
    question:
      'Wer hat diese Regel aufgestellt, und was würde tatsächlich passieren, wenn ich sie nicht erfülle?',
  },
  {
    id: 'labelling',
    label: 'Etikettieren',
    description:
      'Aus einem Verhalten wird eine Eigenschaft. Nicht „das lief heute schlecht", sondern „ich bin so".',
    example: '„Ich bin ein Langweiler."',
    question: 'Wie würde ich dasselbe beschreiben, wenn ich nur über das Verhalten spräche?',
  },
  {
    id: 'personalisation',
    label: 'Alles auf mich beziehen',
    description:
      'Ich sehe mich als Ursache für etwas, das viele Ursachen hat oder gar nichts mit mir zu tun hat.',
    example: '„Sie war einsilbig. Ich habe irgendetwas falsch gemacht."',
    question: 'Welche anderen Gründe könnte es geben, die nichts mit mir zu tun haben?',
  },
  {
    id: 'magnifying',
    label: 'Vergrößern und verkleinern',
    description:
      'Eigene Fehler betrachte ich durch die Lupe, eigene Stärken durch das umgedrehte Fernglas.',
    example: '„Mein Versprecher war riesig, dass der Rest gut lief, war normal."',
    question: 'Welches Gewicht hätte beides, wenn es jemand anderem passiert wäre?',
  },
  {
    id: 'tunnel_vision',
    label: 'Tunnelblick',
    description:
      'Ich nehme von einer Situation oder einem Menschen nur einen Ausschnitt wahr — meist den ungünstigsten.',
    example: '„Das Feedback bestand aus einem Kritikpunkt." (Es waren fünf Punkte, vier davon positiv.)',
    question: 'Was gehörte noch dazu, das ich gerade nicht mitzähle?',
  },
  {
    id: 'unfair_comparison',
    label: 'Unfairer Vergleich',
    description:
      'Ich vergleiche mich mit denen, die genau das am besten können — und mache das Ergebnis zum Maßstab.',
    example: '„Alle anderen wirken im Meeting völlig entspannt."',
    question: 'Vergleiche ich mein Innenleben gerade mit dem Auftreten anderer?',
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
