/**
 * Was lässt sich im Browser überhaupt anzeigen?
 *
 * Der Grundsatz: Vorschau nur, wenn der Browser den Inhalt von sich aus
 * darstellen kann (Bild, Video, Audio, Text) oder wir einen Renderer
 * mitbringen (PDF über pdf.js). Alles andere – Office-Dokumente, Archive,
 * Binärdateien – bekommt bewusst KEINE halbgare Vorschau, sondern die
 * Metadaten und den Download. Ein Word-Dokument anzuzeigen bräuchte einen
 * Konverter auf dem Pi (wie Nextcloud mit Collabora); das ist ein eigenes
 * Projekt und keine Vorschau.
 *
 * PDF läuft über pdf.js und nicht über <iframe>: Chrome auf Android hat keinen
 * eingebauten PDF-Betrachter für eingebettete Rahmen, die Vorschau wäre dort
 * also leer – und das ist genau der Fall (Scans auf dem Handy), um den es hier
 * geht.
 */

/** Endungen, die als Text durchgehen, auch wenn der MIME-Typ es nicht sagt. */
const TEXT_EXTENSIONS = new Set([
  'txt',
  'md',
  'markdown',
  'csv',
  'log',
  'json',
  'yml',
  'yaml',
  'xml',
  'ini',
  'conf',
  'env',
  'js',
  'jsx',
  'ts',
  'tsx',
  'css',
  'scss',
  'html',
  'py',
  'sh',
  'sql',
]);

/**
 * Ab hier wird nicht mehr ungefragt geladen. Über Tailscale hängt die App an
 * einer Haushalts-Uploadleitung: ein 30-MB-Scan blockiert die Vorschau
 * sekundenlang, ohne dass jemand danach gefragt hätte. Video und Audio fehlen
 * hier absichtlich – die streamen per Range-Request und laden nur, was gerade
 * gebraucht wird.
 */
export const PREVIEW_SIZE_LIMITS = {
  image: 20 * 1024 * 1024,
  pdf: 30 * 1024 * 1024,
  text: 512 * 1024,
};

/**
 * @returns {'image'|'pdf'|'video'|'audio'|'text'|'none'}
 */
export function previewKind(entry) {
  if (!entry || entry.type !== 'file') return 'none';

  const mimeType = entry.mimeType ?? '';

  // SVG ist zwar ein Bild, aber auch ein Dokument mit Skript-Möglichkeit. Im
  // <img> wird nichts davon ausgeführt, deshalb ist die Anzeige dort sicher.
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType === 'application/pdf') return 'pdf';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';

  if (mimeType.startsWith('text/') || mimeType === 'application/json') return 'text';

  const extension = entry.name.split('.').pop()?.toLowerCase() ?? '';
  if (TEXT_EXTENSIONS.has(extension)) return 'text';

  return 'none';
}

/** Größenbremse: true, wenn erst nach Rückfrage geladen werden soll. */
export function exceedsPreviewLimit(kind, size) {
  const limit = PREVIEW_SIZE_LIMITS[kind];
  return Boolean(limit && size > limit);
}
