/**
 * Notizen-Endpunkte.
 *
 * Der Client ist die Quelle der IDs (UUID) und der `updatedAt`-Zeitstempel;
 * der Server ist der gemeinsame Treffpunkt und löst Konflikte per
 * last-write-wins auf. Auth gibt es bewusst nicht: der Server lauscht nur auf
 * dem Loopback des Pi und ist ausschließlich über den Reverse-Proxy im
 * Tailnet erreichbar.
 */

/** Eine Notiz, wie sie über die Leitung geht. */
const noteSchema = {
  type: 'object',
  required: ['id', 'createdAt', 'updatedAt'],
  additionalProperties: false,
  properties: {
    id: { type: 'string', minLength: 1, maxLength: 64 },
    title: { type: 'string', maxLength: 500 },
    // Seit dem Rich-Text-Editor HTML statt Klartext. Bilder stecken NICHT
    // darin, sondern nur als <img data-image-id="…"> – deshalb reicht ein
    // Limit, das für Text großzügig ist, ohne den Sync zu belasten.
    body: { type: 'string', maxLength: 1_000_000 },
    createdAt: { type: 'integer', minimum: 0 },
    updatedAt: { type: 'integer', minimum: 0 },
    // null = aktiv, Zahl = gelöscht (Tombstone).
    deletedAt: { type: ['integer', 'null'], minimum: 0 },
    // 1 = Favorit, wird in der Liste oben angezeigt.
    pinned: { type: 'integer', minimum: 0, maximum: 1, default: 0 },
  },
};

const sinceSchema = { type: 'integer', minimum: 0, default: 0 };

export default async function notesRoutes(app) {
  /**
   * Alle Notizen, die seit `since` geändert wurden – inklusive der als
   * gelöscht markierten. `since` ist eine Server-Zeit aus einer früheren
   * Antwort (siehe `serverTime`), 0 liefert alles.
   */
  app.get(
    '/notes',
    {
      schema: {
        querystring: {
          type: 'object',
          additionalProperties: false,
          properties: { since: sinceSchema },
        },
      },
    },
    async (request) => {
      const notes = app.notes.listChangedSince(request.query.since);
      return { notes, serverTime: Date.now() };
    }
  );

  /**
   * Der eigentliche Sync in einem Round-Trip:
   * Push (die Änderungen des Clients) und Pull (was der Server Neueres hat).
   *
   * Die Antwort lässt genau die Notizen weg, bei denen der Client-Stand
   * gewonnen hat – die kennt er schon. Alles andere gewinnt der Server.
   */
  app.post(
    '/notes/sync',
    {
      schema: {
        body: {
          type: 'object',
          additionalProperties: false,
          properties: {
            since: sinceSchema,
            notes: { type: 'array', maxItems: 1000, items: noteSchema, default: [] },
          },
        },
      },
    },
    async (request) => {
      const { since, notes: incoming } = request.body;

      const { settled, rejected, applied } = app.notes.applyIncoming(incoming, Date.now());

      const notes = app.notes
        .listChangedSince(since)
        .filter((note) => !settled.has(note.id));

      // Abgelehnte Notizen zwingend mitschicken, auch wenn sie älter als
      // `since` sind. Sonst entsteht ein Patt: der Client hält seine Fassung
      // weiter für ungesendet, der Server lehnt sie bei jedem Lauf erneut ab,
      // und weil seine eigene Fassung vor dem Wasserstand liegt, bekommt der
      // Client sie nie zu sehen. Das kann bei auseinanderlaufenden Uhren
      // passieren – dann muss der Abgleich trotzdem konvergieren.
      const alreadyIncluded = new Set(notes.map((note) => note.id));
      for (const id of rejected) {
        if (alreadyIncluded.has(id)) continue;
        const correction = app.notes.getById(id);
        if (correction) notes.push(correction);
      }

      // `settled` sagt dem Client ausdrücklich, welche seiner Notizen
      // angekommen sind. Nur die darf er als synchronisiert abhaken – der Rest
      // steckt in `notes` und überschreibt seinen Stand.
      // `serverTime` erst NACH dem Schreiben abgreifen: der neue Wasserstand
      // darf nicht älter sein als die Änderungen dieser Runde.
      return { notes, settled: [...settled], applied, serverTime: Date.now() };
    }
  );
}