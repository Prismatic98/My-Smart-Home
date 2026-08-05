/**
 * Statuscheck. Fragt bewusst die Datenbank an, damit eine kaputte oder nicht
 * beschreibbare DB-Datei hier auffällt und nicht erst beim ersten Sync.
 */
export default async function healthRoutes(app) {
  app.get('/health', async (_request, reply) => {
    try {
      const { total, deleted } = app.notes.stats();
      // Nur Zeilenzahlen, wie bei den Notizen. Über die Inhalte des
      // Innehalten-Moduls sagt der Server nichts aus – er kennt sie nicht.
      const pause = app.pause.stats();
      return {
        status: 'ok',
        notes: { total, active: total - deleted, deleted },
        pause: {
          total: pause.total,
          active: pause.total - pause.deleted,
          deleted: pause.deleted,
        },
        uptime: Math.round(process.uptime()),
      };
    } catch (cause) {
      app.log.error({ err: cause }, 'Healthcheck fehlgeschlagen');
      return reply.code(503).send({ status: 'error', error: 'Datenbank nicht erreichbar' });
    }
  });
}