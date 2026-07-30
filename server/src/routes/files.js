import { randomUUID } from 'node:crypto';
import { createReadStream, createWriteStream } from 'node:fs';
import { rename, stat } from 'node:fs/promises';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';

import { invalidPath, ioError, tooLarge } from '../errors.js';
import {
  isRoot,
  resolveExisting,
  resolveParentDirectory,
  validateName,
} from '../files/paths.js';
import {
  listDirectory,
  lookupMimeType,
  makeDirectory,
  moveEntry,
  removeEntry,
  removeQuietly,
  renameEntry,
  reserveUniqueName,
  readUsage,
  toClientPath,
} from '../files/store.js';

/**
 * Dateiablage.
 *
 * Anders als die Notizen sind Dateien reine Server-Daten: es gibt keinen
 * Offline-Layer und keinen Abgleich, der Client sieht immer den echten Zustand
 * des Dateisystems.
 *
 * Sicherheitsregel für jede Route hier: kein Pfad aus dem Request darf das
 * Dateisystem erreichen, ohne vorher durch resolveSafePath() bzw. die darauf
 * aufbauenden Helfer gelaufen zu sein.
 */

const pathQuerySchema = {
  type: 'object',
  additionalProperties: false,
  properties: { path: { type: 'string', maxLength: 4096, default: '/' } },
};

/**
 * Wie pathQuerySchema, plus `inline`: dann geht die Datei mit
 * `Content-Disposition: inline` raus und der Browser zeigt sie an, statt einen
 * Download anzustoßen. Genau ein Buchstabe Unterschied in der Kopfzeile
 * entscheidet zwischen Vorschau und Speichern-Dialog.
 */
const downloadQuerySchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    path: { type: 'string', maxLength: 4096, default: '/' },
    inline: { type: 'boolean', default: false },
  },
};

export default async function filesRoutes(app) {
  /** Inhalt eines Verzeichnisses. */
  app.get('/list', { schema: { querystring: pathQuerySchema } }, async (request) => {
    const { absPath, relPath, stats } = await resolveExisting(request.query.path, {
      missingMessage: `Den Ordner ${request.query.path} gibt es nicht.`,
    });

    if (!stats.isDirectory()) {
      throw invalidPath(`${relPath} ist ein Ordner-Aufruf, zeigt aber auf eine Datei.`);
    }

    return { path: relPath, entries: await listDirectory(absPath) };
  });

  /**
   * Upload einer einzelnen Datei.
   *
   * Streaming, nie im RAM: @fastify/multipart liefert mit request.file() einen
   * Lesestrom, der direkt auf die Platte geht.
   *
   * Das Zielverzeichnis kommt als Query-Parameter und nicht als Formularfeld.
   * Im Multipart-Strom stünde ein Feld unter Umständen erst NACH dem Datei-Teil
   * zur Verfügung – dann wüsste man beim Schreiben noch nicht wohin.
   *
   * Geschrieben wird zuerst in eine Punkt-Datei im Zielverzeichnis (also im
   * selben Dateisystem, damit das anschließende rename atomar ist und nicht
   * kopieren muss). Sichtbar wird die Datei erst mit dem rename – halbfertige
   * Uploads tauchen im Listing nie auf.
   */
  app.post('/upload', { schema: { querystring: pathQuerySchema } }, async (request) => {
    const { absPath: dirAbs, relPath: dirRel } = await resolveParentDirectory(request.query.path);

    const part = await request.file();
    if (!part) {
      throw invalidPath('Der Upload enthielt keine Datei.');
    }

    const desiredName = validateName(part.filename);
    const tmpAbs = path.join(dirAbs, `.upload-${randomUUID()}.tmp`);

    let reservedName;
    try {
      await pipeline(part.file, createWriteStream(tmpAbs));

      // Doppelte Absicherung: je nach Fehlerzeitpunkt meldet multipart das
      // Limit als Stream-Fehler (oben) oder nur über dieses Flag.
      if (part.file.truncated) {
        throw tooLarge('Die Datei überschreitet das Limit von 5 GB.');
      }

      reservedName = await reserveUniqueName(dirAbs, desiredName);
      await rename(tmpAbs, path.join(dirAbs, reservedName));
    } catch (cause) {
      await removeQuietly(tmpAbs);
      if (reservedName) await removeQuietly(path.join(dirAbs, reservedName));

      if (cause.code === 'FST_REQ_FILE_TOO_LARGE') {
        throw tooLarge('Die Datei überschreitet das Limit von 5 GB.');
      }
      if (cause.statusCode) throw cause;
      throw ioError(`Der Upload ist fehlgeschlagen: ${cause.message}`);
    }

    const stats = await stat(path.join(dirAbs, reservedName));

    return {
      name: reservedName,
      size: stats.size,
      path: toClientPath(dirRel, reservedName),
      mimeType: lookupMimeType(reservedName),
    };
  });

  /** Neuen Ordner anlegen. */
  app.post(
    '/mkdir',
    {
      schema: {
        body: {
          type: 'object',
          required: ['name'],
          additionalProperties: false,
          properties: {
            path: { type: 'string', maxLength: 4096, default: '/' },
            name: { type: 'string', maxLength: 255 },
          },
        },
      },
    },
    async (request, reply) => {
      const { absPath: parentAbs, relPath: parentRel } = await resolveParentDirectory(
        request.body.path
      );
      const name = validateName(request.body.name);

      await makeDirectory(parentAbs, name);

      return reply.code(201).send({
        name,
        type: 'dir',
        path: toClientPath(parentRel, name),
      });
    }
  );

  /** Datei oder Ordner umbenennen. */
  app.patch(
    '/rename',
    {
      schema: {
        body: {
          type: 'object',
          required: ['path', 'newName'],
          additionalProperties: false,
          properties: {
            path: { type: 'string', maxLength: 4096 },
            newName: { type: 'string', maxLength: 255 },
          },
        },
      },
    },
    async (request) => {
      const { absPath, relPath } = await resolveExisting(request.body.path, {
        missingMessage: 'Der Eintrag existiert nicht (mehr).',
      });

      if (isRoot(relPath)) {
        throw invalidPath('Das Wurzelverzeichnis lässt sich nicht umbenennen.');
      }

      const newName = validateName(request.body.newName);
      await renameEntry(absPath, newName);

      return { name: newName, path: toClientPath(path.posix.dirname(relPath), newName) };
    }
  );

  /**
   * Verschieben in einen anderen Ordner. Der Name bleibt, nur das
   * Verzeichnis wechselt – Umbenennen und Verschieben bleiben getrennt.
   */
  app.patch(
    '/move',
    {
      schema: {
        body: {
          type: 'object',
          required: ['path', 'targetPath'],
          additionalProperties: false,
          properties: {
            path: { type: 'string', maxLength: 4096 },
            targetPath: { type: 'string', maxLength: 4096 },
          },
        },
      },
    },
    async (request) => {
      const { absPath, relPath, stats } = await resolveExisting(request.body.path, {
        missingMessage: 'Der Eintrag existiert nicht (mehr).',
      });

      if (isRoot(relPath)) {
        throw invalidPath('Das Wurzelverzeichnis lässt sich nicht verschieben.');
      }

      const { absPath: targetAbs, relPath: targetRel } = await resolveParentDirectory(
        request.body.targetPath
      );

      // Einen Ordner in sich selbst zu schieben würde den Teilbaum abhängen –
      // rename() lässt das teils sogar zu und hinterlässt ein Durcheinander.
      if (stats.isDirectory()) {
        const inside = path.relative(absPath, targetAbs);
        if (inside === '' || (!inside.startsWith('..') && !path.isAbsolute(inside))) {
          throw invalidPath('Ein Ordner lässt sich nicht in sich selbst verschieben.');
        }
      }

      if (path.dirname(absPath) === targetAbs) {
        // Schon am Ziel – kein Fehler, aber auch nichts zu tun.
        return { path: relPath, moved: false };
      }

      const name = path.posix.basename(relPath);
      await moveEntry(absPath, targetAbs);

      return { name, path: toClientPath(targetRel, name), moved: true };
    }
  );

  /** Datei oder Ordner löschen, Ordner samt Inhalt. */
  app.delete('/entry', { schema: { querystring: pathQuerySchema } }, async (request) => {
    const { absPath, relPath } = await resolveExisting(request.query.path, {
      missingMessage: 'Der Eintrag existiert nicht (mehr).',
    });

    if (isRoot(relPath)) {
      throw invalidPath('Das Wurzelverzeichnis lässt sich nicht löschen.');
    }

    await removeEntry(absPath);

    return { path: relPath, deleted: true };
  });

  /**
   * Download als Stream.
   *
   * Range-Requests werden mitbedient. Das kostet hier wenig und ist die
   * Voraussetzung dafür, dass ein <video>/<audio>-Element springen kann – ohne
   * Range lädt der Browser jedes Mal die ganze Datei.
   *
   * `inline=true` liefert dieselben Bytes, aber als Vorschau statt als Download.
   */
  app.get('/download', { schema: { querystring: downloadQuerySchema } }, async (request, reply) => {
    const { absPath, relPath, stats } = await resolveExisting(request.query.path, {
      missingMessage: 'Die Datei existiert nicht (mehr).',
    });

    if (!stats.isFile()) {
      throw invalidPath('Ordner lassen sich nicht herunterladen.');
    }

    const name = path.posix.basename(relPath);
    const total = stats.size;

    // Zuerst den Range auswerten: die 416-Antwort ist JSON und darf nicht den
    // Content-Type der Datei erben, sonst scheitert die Serialisierung.
    const range = parseRange(request.headers.range, total);

    if (range === 'invalid') {
      return reply
        .code(416)
        .type('application/json')
        .header('Accept-Ranges', 'bytes')
        .header('Content-Range', `bytes */${total}`)
        .send({
          error: { code: 'INVALID_RANGE', message: 'Der angeforderte Bereich liegt außerhalb der Datei.' },
        });
    }

    reply
      .header('Accept-Ranges', 'bytes')
      .header('Content-Type', lookupMimeType(name))
      // filename* mit UTF-8: nur so kommen Umlaute und Leerzeichen im
      // Dateinamen unbeschadet beim Browser an.
      .header(
        'Content-Disposition',
        `${request.query.inline ? 'inline' : 'attachment'}; filename*=UTF-8''${encodeURIComponent(name)}`
      )
      // Der Inhalt kann sich unter demselben Pfad jederzeit ändern.
      .header('Cache-Control', 'private, no-cache');

    if (range) {
      return reply
        .code(206)
        .header('Content-Range', `bytes ${range.start}-${range.end}/${total}`)
        .header('Content-Length', range.end - range.start + 1)
        .send(createReadStream(absPath, { start: range.start, end: range.end }));
    }

    return reply.header('Content-Length', total).send(createReadStream(absPath));
  });

  /** Belegung des Datenträgers für die Fußzeile in der UI. */
  app.get('/usage', async () => {
    try {
      return await readUsage();
    } catch (cause) {
      throw ioError(`Speicherbelegung nicht ermittelbar: ${cause.message}`);
    }
  });
}

/**
 * "bytes=0-1023" → { start, end }.
 * Rückgabe: null = kein Range gewünscht, 'invalid' = nicht erfüllbar (416).
 * Mehrfach-Bereiche werden nicht unterstützt – Browser fragen sie für
 * Medienwiedergabe auch nicht an.
 */
function parseRange(header, total) {
  if (!header) return null;

  const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!match) return 'invalid';

  const [, rawStart, rawEnd] = match;
  if (rawStart === '' && rawEnd === '') return 'invalid';

  let start;
  let end;

  if (rawStart === '') {
    // Suffix-Form: die letzten N Bytes.
    const length = Number(rawEnd);
    if (length <= 0) return 'invalid';
    start = Math.max(0, total - length);
    end = total - 1;
  } else {
    start = Number(rawStart);
    end = rawEnd === '' ? total - 1 : Number(rawEnd);
  }

  if (!Number.isFinite(start) || !Number.isFinite(end)) return 'invalid';
  if (start > end || start < 0 || start >= total) return 'invalid';

  return { start, end: Math.min(end, total - 1) };
}
