/**
 * Die Farbe des Moduls.
 *
 * Klarblick hebt sich bewusst von den übrigen Modulen ab: Grün, ruhig und
 * freundlich. Das Modul soll beim Öffnen nicht nach Formular und nicht nach
 * Krankenakte aussehen – es ist das Modul, in dem man etwas für sich klärt.
 *
 * **Die Farbe hängt nie von einem Wert ab.** Ein Regler auf 90 ist genauso
 * grün wie einer auf 10; die Farbe gehört dem Modul, nicht der Zahl. Rot
 * bleibt Fehlern und der Komplettlöschung vorbehalten.
 *
 * An einer Stelle definiert, damit Navigation, Kacheln, Regler und
 * Schrittleiste nicht auseinanderlaufen. Der Eintrag in `lib/modules.js`
 * trägt denselben Wert – dort steht er als Literal, weil die Modulliste
 * nichts aus einem Feature importieren soll.
 */
export const CLARITY_COLOR = 'green';
