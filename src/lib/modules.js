import { IconBulb, IconFolders, IconNotes } from '@tabler/icons-react';

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
];
