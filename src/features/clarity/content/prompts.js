/**
 * Fragen und Hilfetexte der Oberfläche.
 *
 * Alles hier ist Anregung, nie Vorgabe: Es gibt keinen Text, der einen Eintrag
 * bewertet, einordnet oder empfiehlt. Die App stellt Fragen und speichert
 * Antworten – die inhaltliche Arbeit macht Dennis, die fachliche Einordnung
 * seine Therapeutin.
 *
 * **Urheberrecht:** Aufbau, Reihenfolge und Inhalt der Fragen folgen dem
 * Arbeitsblatt, das in der Sitzung benutzt wird. Die Methode ist
 * Fachallgemeingut, der Wortlaut des Blattes nicht – deshalb ist hier alles
 * eigenständig formuliert und nichts abgetippt. Die Herleitung steht in
 * docs/clarity-fachliche-grundlagen.md.
 */

/**
 * Die Hilfsfragen, mit denen sich eine Antwort auf den automatischen Gedanken
 * finden lässt – auf dem Arbeitsblatt stehen sie unter der Tabelle.
 *
 * Jede bekommt ein eigenes Feld und wird beantwortet, nicht nur angeboten:
 * die Fragen sind die eigentliche Arbeit dieses Schrittes. Ein einzelnes
 * Freitextfeld mit den Fragen als Anregung daneben führte dazu, dass zwei
 * davon beantwortet werden und vier nie.
 *
 * `id` landet in `responseAnswers` und darf sich deshalb nie ändern – auch
 * dann nicht, wenn die Formulierung überarbeitet wird.
 */
export const RESPONSE_QUESTIONS = [
  {
    id: 'evidence',
    text: 'Was spricht dafür, dass der Gedanke zutrifft — und was spricht dagegen?',
  },
  {
    id: 'alternative',
    text: 'Gibt es eine andere Erklärung für das, was passiert ist?',
  },
  {
    id: 'worst',
    text: 'Was ist das Schlimmste, das passieren könnte, und käme ich damit zurecht? Was wäre das Beste? Was ist das Wahrscheinlichste?',
  },
  {
    id: 'effect',
    text: 'Was ändert sich, wenn ich dem Gedanken glaube? Und was, wenn ich anders darüber denke?',
  },
  {
    id: 'action',
    text: 'Was kann ich jetzt konkret tun?',
  },
  {
    id: 'friend',
    text: 'Wenn jemand, der mir wichtig ist, in dieser Lage wäre und so dächte — was würde ich ihm sagen?',
  },
];

/** Hilfetexte, die an den jeweiligen Stellen eingeblendet werden. */
export const HELP_TEXTS = {
  intro:
    'Hier liegen deine Arbeitsblätter. Klarblick zeigt dir nichts an, was du nicht selbst eingetragen hast, und bewertet nichts. Es ist eine Ergänzung zu deinen Sitzungen, kein Ersatz.',

  /** Der Anlass, ein Protokoll überhaupt anzufangen – steht oben auf dem Blatt. */
  trigger:
    'Wenn du merkst, dass deine Stimmung kippt, frag dich: Was ist mir gerade durch den Kopf gegangen? Schreib den Gedanken oder das innere Bild so schnell wie möglich auf — genauer wird es später.',

  belief:
    'Nicht, wie sehr der Gedanke stimmt, sondern wie sehr du ihm in dem Moment geglaubt hast.',

  distortions:
    'Freiwillig. Es wird nichts automatisch erkannt, und keine Auswahl ist die richtige.',

  response:
    'Eine Antwort auf den Gedanken, nicht auf die Situation. Nicht schöner, sondern genauer: etwas, das zu allem passt, was du weißt.',
};
