/**
 * Die Farbe des Moduls: ein ruhiges Blau.
 *
 * Das Modul soll beim Öffnen nicht nach Formular und nicht nach Krankenakte
 * aussehen – es ist das Modul, in dem man etwas für sich klärt. Blau ist
 * zugleich die Primärfarbe der App (theme.js) und die Farbe des Smart-Home-
 * Moduls; Innehalten sticht damit nicht heraus, sondern liegt ruhig im
 * Farbklang der App.
 *
 * **Die Farbe hängt nie von einem Wert ab.** Ein Regler auf 90 ist genauso
 * blau wie einer auf 10; die Farbe gehört dem Modul, nicht der Zahl. Rot
 * bleibt Fehlern und der Komplettlöschung vorbehalten.
 *
 * An einer Stelle definiert, damit Navigation, Kacheln, Regler und
 * Schrittleiste nicht auseinanderlaufen. Zwei Stellen tragen denselben Wert
 * noch einmal, weil sie nichts aus einem Feature importieren sollen bzw.
 * nicht importieren können:
 *  - `lib/modules.js` (Modulliste der App) als Literal,
 *  - `styles/global.scss` als `--pause-accent…` für die SCSS-Module.
 */
export const PAUSE_COLOR = 'blue';
