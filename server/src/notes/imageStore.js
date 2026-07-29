import { constants } from 'node:fs';
import { access, mkdir, rm, stat } from 'node:fs/promises';
import path from 'node:path';

import { invalidPath, notFound } from '../errors.js';

/**
 * Bilder aus Notizen.
 *
 * Die Bytes liegen als Datei unter NOTE_IMAGES_ROOT, die Metadaten in SQLite.
 * Das hält die Datenbank klein und erlaubt Streaming beim Ausliefern.
 *
 * Der Dateiname ist ausschließlich die UUID – es gibt hier also keinen
 * Pfad-Anteil, der vom Client kommt, und damit auch keine Traversal-Fläche.
 * Trotzdem wird die ID streng geprüft, statt sich darauf zu verlassen.
 */

export const NOTE_IMAGES_ROOT = path.resolve(
  process.env.NOTE_IMAGES_ROOT ?? './data/note-images'
);

/** Nur echte UUIDs, wie sie crypto.randomUUID() erzeugt. */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Zwischenablage-Bilder sind Screenshots oder Fotos – das reicht dafür. */
export const MAX_IMAGE_BYTES = 25 * 1024 * 1024;

const ALLOWED_MIME = /^image\/(png|jpeg|gif|webp|avif|bmp|svg\+xml)$/;

export async function ensureImagesRoot() {
  try {
    await mkdir(NOTE_IMAGES_ROOT, { recursive: true });
    await access(NOTE_IMAGES_ROOT, constants.W_OK | constants.X_OK);
  } catch (cause) {
    throw new Error(
      `Bildablage ${NOTE_IMAGES_ROOT} ist nicht beschreibbar: ${cause.message}`,
      { cause }
    );
  }
  return NOTE_IMAGES_ROOT;
}

export function assertImageId(id) {
  if (!UUID.test(String(id ?? ''))) {
    throw invalidPath('Ungültige Bild-ID.');
  }
  return id;
}

export function assertMimeType(mimeType) {
  const value = String(mimeType ?? '').split(';')[0].trim().toLowerCase();
  if (!ALLOWED_MIME.test(value)) {
    throw invalidPath(`Dateityp ${value || '(unbekannt)'} ist als Bild nicht zugelassen.`);
  }
  return value;
}

/** Absoluter Pfad zu den Bytes eines Bildes. */
export function imagePath(id) {
  return path.join(NOTE_IMAGES_ROOT, assertImageId(id));
}

export async function imageFileSize(id) {
  try {
    const stats = await stat(imagePath(id));
    return stats.size;
  } catch (cause) {
    if (cause.code === 'ENOENT') throw notFound('Das Bild existiert nicht (mehr).');
    throw cause;
  }
}

export async function removeImageFile(id) {
  await rm(imagePath(id), { force: true });
}

/** Datenzugriff auf die Metadaten. */
export function createImageRepository(db) {
  const selectById = db.prepare('SELECT * FROM note_images WHERE id = ?');

  const upsert = db.prepare(`
    INSERT INTO note_images (id, noteId, mimeType, size, createdAt, serverUpdatedAt)
    VALUES (@id, @noteId, @mimeType, @size, @createdAt, @serverUpdatedAt)
    ON CONFLICT(id) DO UPDATE SET
      noteId = excluded.noteId,
      mimeType = excluded.mimeType,
      size = excluded.size,
      serverUpdatedAt = excluded.serverUpdatedAt
  `);

  const remove = db.prepare('DELETE FROM note_images WHERE id = ?');
  const count = db.prepare('SELECT COUNT(*) AS total, COALESCE(SUM(size), 0) AS bytes FROM note_images');

  return {
    get: (id) => selectById.get(assertImageId(id)),
    /** Idempotent: ein wiederholter Upload derselben ID ist kein Fehler. */
    save: (image) => upsert.run(image),
    remove: (id) => remove.run(assertImageId(id)),
    stats: () => count.get(),
  };
}
