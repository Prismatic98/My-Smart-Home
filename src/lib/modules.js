import { IconBulb, IconFolders, IconNotes, IconRibbonHealth } from '@tabler/icons-react';

/**
 * Einzige Quelle der Wahrheit für die Module.
 * Wird sowohl von der Navigation (AppLayout) als auch von der Startseite genutzt.
 *
 * Bewusst ohne Beschreibung und Status: die Kacheln zeigen nur Icon und Name.
 */
export const modules = [
  {
    key: 'notes',
    path: '/notes',
    label: 'Notizen',
    icon: IconNotes,
    color: 'yellow',
  },
  {
    key: 'files',
    path: '/files',
    label: 'Datenablage',
    icon: IconFolders,
    color: 'teal',
  },
  {
    key: 'smarthome',
    path: '/smart-home',
    label: 'Smart Home',
    icon: IconBulb,
    color: 'blue',
  },
  {
    // Route und Code heißen 'pause', angezeigt wird 'Innehalten'. Im gesamten
    // Modul kommen die Wörter Therapie, Störung, Symptom, Patient und
    // Behandlung nicht vor – die App wird in der Bahn und im Büro geöffnet.
    key: 'pause',
    path: '/pause',
    label: 'Innehalten',
    icon: IconRibbonHealth,
    // Muss zu PAUSE_COLOR in features/pause/lib/appearance.js passen.
    // Als Literal, weil die Modulliste nichts aus einem Feature importiert.
    //
    // Die Stufe .5 ist derselbe helle Ton, den „Nachher" im Gedankenprotokoll
    // trägt (LIGHT in components/BeforeAfter.jsx). Eine Abstufung derselben
    // Modulfarbe, kein zweiter Farbname – wird dort die Stufe geändert, gehört
    // sie hier mit geändert.
    color: 'blue.5',
  },
];
