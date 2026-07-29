import {
  IconFile,
  IconFileSpreadsheet,
  IconFileText,
  IconFileTypePdf,
  IconFileZip,
  IconFolder,
  IconMusic,
  IconPhoto,
  IconVideo,
} from '@tabler/icons-react';

/**
 * Icon und Farbe je Dateityp.
 *
 * Der MIME-Typ kommt schon vom Server, die Endung dient nur als Rückfallebene
 * für Typen, die `mime-types` nicht kennt (Archive, Code).
 */

const BY_EXTENSION = {
  zip: 'archive',
  rar: 'archive',
  '7z': 'archive',
  tar: 'archive',
  gz: 'archive',
  bz2: 'archive',
  xz: 'archive',
  js: 'code',
  jsx: 'code',
  ts: 'code',
  tsx: 'code',
  json: 'code',
  yml: 'code',
  yaml: 'code',
  html: 'code',
  css: 'code',
  scss: 'code',
  py: 'code',
  sh: 'code',
  sql: 'code',
};

const CATEGORIES = {
  folder: { icon: IconFolder, color: 'blue', label: 'Ordner' },
  image: { icon: IconPhoto, color: 'green', label: 'Bild' },
  video: { icon: IconVideo, color: 'grape', label: 'Video' },
  audio: { icon: IconMusic, color: 'pink', label: 'Audio' },
  pdf: { icon: IconFileTypePdf, color: 'red', label: 'PDF' },
  document: { icon: IconFileText, color: 'indigo', label: 'Dokument' },
  spreadsheet: { icon: IconFileSpreadsheet, color: 'teal', label: 'Tabelle' },
  archive: { icon: IconFileZip, color: 'orange', label: 'Archiv' },
  code: { icon: IconFile, color: 'cyan', label: 'Code' },
  other: { icon: IconFile, color: 'gray', label: 'Datei' },
};

/** @returns {{ icon: Function, color: string, label: string }} */
export function fileIcon(entry) {
  return CATEGORIES[categorize(entry)] ?? CATEGORIES.other;
}

function categorize(entry) {
  if (entry.type === 'dir') return 'folder';

  const mimeType = entry.mimeType ?? '';
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';
  if (mimeType === 'application/pdf') return 'pdf';

  if (
    mimeType.startsWith('text/') ||
    mimeType.includes('word') ||
    mimeType.includes('opendocument.text')
  ) {
    return 'document';
  }

  if (mimeType.includes('sheet') || mimeType.includes('excel') || mimeType === 'text/csv') {
    return 'spreadsheet';
  }

  const extension = entry.name.split('.').pop()?.toLowerCase() ?? '';
  return BY_EXTENSION[extension] ?? 'other';
}
