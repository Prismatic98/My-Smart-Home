import { IconBulb, IconCompass, IconFolders, IconNotes } from '@tabler/icons-react';

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
    // Route und Code heißen 'clarity', angezeigt wird 'Klarblick'. Im gesamten
    // Modul kommen die Wörter Therapie, Störung, Symptom, Patient und
    // Behandlung nicht vor – die App wird in der Bahn und im Büro geöffnet.
    key: 'clarity',
    path: '/clarity',
    label: 'Klarblick',
    icon: IconCompass,
    color: 'grape',
  },
];
