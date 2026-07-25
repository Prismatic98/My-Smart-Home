import { IconBulb, IconFolders, IconNotes } from '@tabler/icons-react';

/**
 * Einzige Quelle der Wahrheit für die geplanten Module.
 * Wird sowohl von der Navigation (AppLayout) als auch von der Startseite genutzt.
 */
export const modules = [
  {
    key: 'notes',
    path: '/notizen',
    label: 'Notizen',
    description: 'Notizen anlegen und bearbeiten – lokal im Browser gespeichert, offline nutzbar.',
    icon: IconNotes,
    color: 'yellow',
    status: 'lokal',
  },
  {
    key: 'files',
    path: '/dateien',
    label: 'Datenablage',
    description: 'Dateien von überall hochladen, gespeichert auf der SSD des Raspberry Pi.',
    icon: IconFolders,
    color: 'teal',
    status: 'geplant',
  },
  {
    key: 'smarthome',
    path: '/smarthome',
    label: 'Smart Home',
    description: 'Geräte und Automationen über Home Assistant steuern und überwachen.',
    icon: IconBulb,
    color: 'blue',
    status: 'geplant',
  },
];