import Fastify from 'fastify';

import { createNotesRepository } from './notesRepository.js';
import healthRoutes from './routes/health.js';
import notesRoutes from './routes/notes.js';

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
    // Ein voller Erst-Sync kann viele Notizen auf einmal enthalten.
    bodyLimit: 8 * 1024 * 1024,
  });

  app.decorate('notes', createNotesRepository(db));

  app.register(healthRoutes);
  app.register(notesRoutes);

  return app;
}