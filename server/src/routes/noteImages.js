import { createReadStream, createWriteStream } from 'node:fs';
import { rename, rm } from 'node:fs/promises';
import { pipeline } from 'node:stream/promises';

import { invalidPath, ioError, notFound, tooLarge } from '../errors.js';
import {
  assertImageId,
  assertMimeType,
  imageFileSize,
  imagePath,
  MAX_IMAGE_BYTES,
  NOTE_IMAGES_ROOT,
  removeImageFile,
} from '../notes/imageStore.js';

/**
 * Bilder in Notizen.
 *
 * Der Client erzeugt die ID selbst (crypto.randomUUID), genau wie bei den
 * Notizen – so kann er ein eingefügtes Bild sofort lokal anzeigen und den
 * Upload später nachholen, auch nach einem Neustart.
 *
 * Deshalb ist der Upload idempotent: derselbe Aufruf zweimal ist kein Fehler.
 *
 * Ein Gegenstück zum Notizen-Sync gibt es bewusst nicht. Ein anderes Gerät
 * bekommt beim Abgleich das Notiz-HTML mit <img data-image-id="…"> und holt
 * die Bytes erst beim Anzeigen – wer eine Notiz nie öffnet, lädt ihre Bilder
 * also auch nie.
 */

const idParams = {
  type: 'object',
  required: ['id'],
  additionalProperties: false,
  properties: { id: { type: 'string', minLength: 36, maxLength: 36 } },
};

export default async function noteImageRoutes(app) {
  /** Upload eines Bildes. ID und zugehörige Notiz stehen im Query-String. */
  app.post(
    '/notes/images',
    {
      schema: {
        querystring: {
          type: 'object',
          required: ['id', 'noteId'],
          additionalProperties: false,
          properties: {
            id: { type: 'string', minLength: 36, maxLength: 36 },
            noteId: { type: 'string', minLength: 1, maxLength: 64 },
          },
        },
      },
    },
    async (request) => {
      const { id, noteId } = request.query;
      assertImageId(id);

      // Engeres Limit als der Datei-Upload: hier landen Screenshots, keine
      // Videosammlungen.
      const part = await request.file({ limits: { fileSize: MAX_IMAGE_BYTES } });
      if (!part) throw invalidPath('Es war kein Bild im Upload enthalten.');

      const mimeType = assertMimeType(part.mimetype);

      // Erst daneben schreiben, dann umbenennen: ein abgebrochener Upload
      // hinterlässt so kein halbes Bild unter der endgültigen ID.
      const target = imagePath(id);
      const temporary = `${target}.part`;

      try {
        await pipeline(part.file, createWriteStream(temporary));
        if (part.file.truncated) {
          throw tooLarge(`Das Bild ist größer als ${Math.round(MAX_IMAGE_BYTES / 1024 / 1024)} MB.`);
        }
        await rename(temporary, target);
      } catch (cause) {
        // Nur die Teildatei wegräumen. Das eigentliche Ziel ist entweder noch
        // unberührt (rename kam nicht dazu) oder der Upload war erfolgreich –
        // es zu löschen würde ein früher schon hochgeladenes Bild vernichten.
        await rm(temporary, { force: true }).catch(() => {});

        if (cause.code === 'FST_REQ_FILE_TOO_LARGE') {
          throw tooLarge(`Das Bild ist größer als ${Math.round(MAX_IMAGE_BYTES / 1024 / 1024)} MB.`);
        }
        if (cause.statusCode) throw cause;
        throw ioError(`Das Bild konnte nicht gespeichert werden: ${cause.message}`);
      }

      const size = await imageFileSize(id);
      const now = Date.now();

      app.noteImages.save({
        id,
        noteId,
        mimeType,
        size,
        createdAt: now,
        serverUpdatedAt: now,
      });

      return { id, noteId, mimeType, size };
    }
  );

  /**
   * Auslieferung. Der Inhalt unter einer ID ändert sich nie – deshalb darf der
   * Browser das Bild beliebig lange behalten.
   */
  app.get('/notes/images/:id', { schema: { params: idParams } }, async (request, reply) => {
    const { id } = request.params;
    const image = app.noteImages.get(id);
    if (!image) throw notFound('Das Bild existiert nicht (mehr).');

    const size = await imageFileSize(id);

    return reply
      .header('Content-Type', image.mimeType)
      .header('Content-Length', size)
      .header('Cache-Control', 'private, max-age=31536000, immutable')
      .send(createReadStream(imagePath(id)));
  });

  /** Löschen, wenn das Bild nicht mehr in einer Notiz steckt. */
  app.delete('/notes/images/:id', { schema: { params: idParams } }, async (request) => {
    const { id } = request.params;

    // Kein 404: Löschen soll idempotent sein, damit der Client es gefahrlos
    // wiederholen kann, wenn er zwischendurch offline war.
    app.noteImages.remove(id);
    await removeImageFile(id);

    return { id, deleted: true };
  });

  app.log.info({ noteImagesRoot: NOTE_IMAGES_ROOT }, 'Bildablage für Notizen bereit');
}
