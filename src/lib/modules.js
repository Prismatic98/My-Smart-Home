import { IconBulb, IconFolders, IconNotes } from '@tabler/icons-react';

/**
 * Einzige Quelle der Wahrheit für die geplanten Module.
 * Wird sowohl von der Navigation (AppLayout) als auch von der Startseite genutzt.
 */
export const modules = [
  {
    key: 'notes',
    path: '/notes',
    label: 'Notizen',
    description: 'Notizen anlegen und bearbeiten – lokal im Browser gespeichert, offline nutzbar.',
    icon: IconNotes,
    color: 'yellow',
    status: 'lokal',
  },
  {
    key: 'files',
    path: '/files',
    label: 'Datenablage',
    description: 'Dateien von überall hochladen, gespeichert auf der SSD des Raspberry Pi.',
    icon: IconFolders,
    color: 'teal',
    status: 'geplant',
  },
  {
    key: 'smarthome',
    path: '/smart-home',
    label: 'Smart Home',
    description: 'Lichter live über Home Assistant steuern – an/aus, Helligkeit, Farbe.',
    icon: IconBulb,
    color: 'blue',
    status: 'live',
  },
];