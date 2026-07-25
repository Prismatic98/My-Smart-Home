/**
 * Statuscheck. Fragt bewusst die Datenbank an, damit eine kaputte oder nicht
 * beschreibbare DB-Datei hier auffällt und nicht erst beim ersten Sync.
 */
export default async function healthRoutes(app) {
  app.get('/health', async (_request, reply) => {
    try {
      const { total, deleted } = app.notes.stats();
      return {
        status: 'ok',
        notes: { total, active: total - deleted, deleted },
        uptime: Math.round(process.uptime()),
      };
    } catch (cause) {
      app.log.error({ err: cause }, 'Healthcheck fehlgeschlagen');
      return reply.code(503).send({ status: 'error', error: 'Datenbank nicht erreichbar' });
    }
  });
}