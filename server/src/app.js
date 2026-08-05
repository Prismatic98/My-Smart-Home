import multipart from '@fastify/multipart';
import Fastify from 'fastify';

import { createPauseRepository } from './pause/repository.js';
import { AppError } from './errors.js';
import { createImageRepository } from './notes/imageStore.js';
import { createNotesRepository } from './notesRepository.js';
import pauseRoutes from './routes/pause.js';
import filesRoutes from './routes/files.js';
import healthRoutes from './routes/health.js';
import noteImageRoutes from './routes/noteImages.js';
import notesRoutes from './routes/notes.js';

/** Obergrenze für einen einzelnen Upload. Muss zur Caddyfile passen. */
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024 * 1024;

/**
 * Baut die Fastify-Instanz. Getrennt von server.js, damit man die App in
 * Tests ohne offenen Port hochziehen kann (app.inject()).
 *
 * Kein CORS-Plugin: im Dev proxyt Vite `/backend` auf diesen Server, in
 * Produktion macht Caddy dasselbe. Aus Sicht des Browsers ist es also immer
 * dieselbe Origin.
 */
export function buildApp({ db, logger = true }) {
  const app = Fastify({
    logger,
    // Ein voller Erst-Sync der Notizen kann viele Datensätze enthalten.
    // Für Uploads gilt das Limit aus der multipart-Registrierung, nicht dieses.
    bodyLimit: 8 * 1024 * 1024,
  });

  app.register(multipart, {
    limits: {
      fileSize: MAX_UPLOAD_BYTES,
      // Ein Request = eine Datei. Mehrere Dateien schickt das Frontend als
      // mehrere Requests, sonst gäbe es keinen Fortschritt pro Datei.
      files: 1,
    },
  });

  /**
   * Ein Format für alle Fehler: { error: { code, message } }.
   * Die `message` ist für den Nutzer geschrieben und wird von der UI direkt
   * angezeigt – deshalb landen unerwartete Fehler bewusst nur als generischer
   * Text nach außen und mit vollem Stack im Log.
   */
  app.setErrorHandler((error, request, reply) => {
    if (error instanceof AppError) {
      return reply.code(error.statusCode).send({
        error: { code: error.code, message: error.message },
      });
    }

    if (error.validation) {
      return reply.code(400).send({
        error: { code: 'INVALID_INPUT', message: `Ungültige Anfrage: ${error.message}` },
      });
    }

    if (error.code === 'FST_REQ_FILE_TOO_LARGE' || error.statusCode === 413) {
      return reply.code(413).send({
        error: { code: 'TOO_LARGE', message: 'Die Datei ist zu groß.' },
      });
    }

    request.log.error({ err: error }, 'Unbehandelter Fehler');

    return reply.code(error.statusCode && error.statusCode < 500 ? error.statusCode : 500).send({
      error: {
        code: 'IO_ERROR',
        message: 'Auf dem Server ist etwas schiefgelaufen. Details stehen im Server-Log.',
      },
    });
  });

  app.setNotFoundHandler((request, reply) =>
    reply.code(404).send({
      error: { code: 'NOT_FOUND', message: `Unbekannter Endpunkt: ${request.url}` },
    })
  );

  app.decorate('notes', createNotesRepository(db));
  app.decorate('noteImages', createImageRepository(db));
  app.decorate('pause', createPauseRepository(db));

  app.register(healthRoutes);
  app.register(notesRoutes);
  app.register(noteImageRoutes);
  app.register(filesRoutes, { prefix: '/files' });
  // Eigener Zweig mit eigenem Fehlerbehandler – der allgemeine oben würde
  // Details einer Schema-Verletzung nach außen geben. Siehe routes/pause.js.
  app.register(pauseRoutes, { prefix: '/pause' });

  return app;
}
