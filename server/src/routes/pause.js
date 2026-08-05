import { RECORD_KINDS } from '../pause/repository.js';

/**
 * Endpunkte des Innehalten-Moduls.
 *
 * Aufbau wie beim Notizen-Sync: der Client ist die Quelle der IDs und der
 * `updatedAt`-Zeitstempel, der Server ist der gemeinsame Treffpunkt und löst
 * Konflikte per last-write-wins auf.
 *
 * **Datenschutz-Regeln, die hier gelten und sonst nirgends:**
 *
 *  - Kein Feldinhalt gelangt in ein Log. Fastify protokolliert von sich aus
 *    keine Request-Bodies; der eigene Zusammenfassungs-Log unten enthält
 *    ausschließlich Anzahl und Zeitstempel. Der Fehlerbehandler dieses Zweigs
 *    gibt bewusst weniger preis als der der übrigen Anwendung – siehe unten.
 *  - Der Inhalt eines Datensatzes ist für den Server eine Zeichenkette. Es
 *    gibt keine inhaltlichen Spalten, keinen Volltextindex und keine
 *    Suchtabelle; gesucht wird ausschließlich lokal über Dexie.
 *  - Zu `DELETE /pause/all` siehe unten: die einzige Stelle der Anwendung,
 *    die hart löscht.
 *
 * Auth gibt es hier so wenig wie anderswo: der Server lauscht nur auf dem
 * Loopback des Pi. Für dieses Modul ist das die offene Flanke – wer im Tailnet
 * die Adresse erreicht, sieht alles. Der App-Login ist deshalb das nächste
 * Vorhaben nach diesem Modul.
 */

/** Ein Datensatz, wie er über die Leitung geht. */
const recordSchema = {
  type: 'object',
  required: ['id', 'createdAt', 'updatedAt'],
  additionalProperties: false,
  properties: {
    id: { type: 'string', minLength: 1, maxLength: 64 },
    /**
     * Der gesamte Inhalt als JSON-Zeichenkette. Der Server liest sie nie – er
     * legt sie ab und gibt sie zurück. Deshalb steht hier ein Längenlimit und
     * kein Objektschema: eine Struktur zu prüfen hieße, sie zu kennen.
     */
    payload: { type: 'string', maxLength: 200_000, default: '{}' },
    createdAt: { type: 'integer', minimum: 0 },
    updatedAt: { type: 'integer', minimum: 0 },
    // null = aktiv, Zahl = gelöscht (Tombstone). Ein Tombstone trägt keinen
    // Inhalt mehr, weder hier noch in der Datenbank.
    deletedAt: { type: ['integer', 'null'], minimum: 0 },
  },
};

const recordArraySchema = {
  type: 'array',
  maxItems: 1000,
  items: recordSchema,
  default: [],
};

/**
 * Ein Feld je Datenart.
 *
 * `additionalProperties` ist bewusst NICHT auf false gesetzt: Fastify räumt
 * unbekannte Felder standardmäßig weg (`removeAdditional`), statt sie
 * abzulehnen. Eine Datenart, die dieser Server noch nicht kennt, verschwände
 * damit stillschweigend – der Client bekäme sie nie in `settled` zurück und
 * würde sie bei jedem Lauf erneut senden. Deshalb wird jede Datenart
 * angenommen; geprüft wird nur die Form der Schlüssel und der Datensätze.
 */
const changesSchema = {
  type: 'object',
  properties: Object.fromEntries(RECORD_KINDS.map((kind) => [kind, recordArraySchema])),
  additionalProperties: recordArraySchema,
  propertyNames: { type: 'string', pattern: '^[A-Za-z][A-Za-z0-9_]{0,63}$' },
  default: {},
};

const sinceSchema = { type: 'integer', minimum: 0, default: 0 };

export default async function pauseRoutes(app) {
  /**
   * Eigener Fehlerbehandler für diesen Zweig.
   *
   * Der allgemeine Behandler in app.js reicht `error.message` einer
   * Schema-Verletzung an den Client durch. Das ist dort richtig (er benennt
   * das fehlerhafte Feld) und hier unerwünscht: die Meldung soll unter keinen
   * Umständen etwas aus dem Body enthalten können. Geloggt wird nur der Code,
   * nie das Fehlerobjekt – ein `err` bringt bei Validierungsfehlern je nach
   * Fastify-Version den geprüften Ausschnitt mit.
   */
  app.setErrorHandler((error, request, reply) => {
    if (error.validation) {
      request.log.warn({ code: 'INVALID_INPUT', url: request.url }, 'Innehalten: Anfrage abgelehnt');
      return reply.code(400).send({
        error: { code: 'INVALID_INPUT', message: 'Die Anfrage passt nicht zum erwarteten Format.' },
      });
    }

    request.log.error(
      { code: error.code, statusCode: error.statusCode, url: request.url },
      'Innehalten: Fehler'
    );

    return reply.code(error.statusCode && error.statusCode < 500 ? error.statusCode : 500).send({
      error: {
        code: 'IO_ERROR',
        message: 'Auf dem Server ist etwas schiefgelaufen. Details stehen im Server-Log.',
      },
    });
  });

  /**
   * Der Sync in einem Round-Trip: Push (die Änderungen des Clients) und Pull
   * (was der Server Neueres hat).
   *
   * Die Antwort lässt genau die Datensätze weg, bei denen der Client-Stand
   * gewonnen hat – die kennt er schon.
   */
  app.post(
    '/sync',
    {
      schema: {
        body: {
          type: 'object',
          additionalProperties: false,
          properties: { since: sinceSchema, changes: changesSchema },
        },
      },
    },
    async (request) => {
      const { since, changes: incoming } = request.body;

      const { settled, rejected, applied } = app.pause.applyIncoming(incoming, Date.now());

      const changes = app.pause.listChangedSince(since);
      for (const kind of Object.keys(changes)) {
        const accepted = settled[kind];
        if (!accepted) continue;
        changes[kind] = changes[kind].filter((record) => !accepted.has(record.id));
      }

      // Abgelehnte Datensätze zwingend mitschicken, auch wenn sie älter als
      // `since` sind. Sonst entsteht ein Patt: der Client hält seine Fassung
      // weiter für ungesendet, der Server lehnt sie bei jedem Lauf erneut ab,
      // und weil seine eigene Fassung vor dem Wasserstand liegt, bekommt der
      // Client sie nie zu sehen. Das kann bei auseinanderlaufenden Uhren
      // passieren – der Abgleich muss trotzdem konvergieren.
      for (const { kind, id } of rejected) {
        const list = (changes[kind] ??= []);
        if (list.some((record) => record.id === id)) continue;
        const correction = app.pause.getById(id);
        if (correction) list.push(correction.record);
      }

      // Bewusst nur Zahlen: was synchronisiert wurde, steht nirgends im Log.
      request.log.info(
        {
          pushed: countAll(incoming),
          pulled: countAll(changes),
          applied,
        },
        'Innehalten-Sync'
      );

      // `settled` sagt dem Client ausdrücklich, welche seiner Datensätze
      // angekommen sind. Nur die darf er als synchronisiert abhaken – der Rest
      // steckt in `changes` und überschreibt seinen Stand.
      // `serverTime` erst NACH dem Schreiben abgreifen: der neue Wasserstand
      // darf nicht älter sein als die Änderungen dieser Runde.
      return {
        changes,
        settled: Object.fromEntries(
          Object.entries(settled).map(([kind, ids]) => [kind, [...ids]])
        ),
        applied,
        serverTime: Date.now(),
      };
    }
  );

  /**
   * Komplettlöschung aus den Modul-Einstellungen.
   *
   * Echtes DELETE ohne Tombstones – die einzige Stelle der Anwendung, an der
   * das passiert. Ein Tombstone würde die Zeile stehen lassen, und bei diesen
   * Daten muss „weg" auch weg heißen. Dass danach kein Tombstone existiert,
   * ist unkritisch: der Client leert im selben Zug seine eigene Datenbank
   * samt Wasserstand, ein zweites Gerät bekäme sonst nichts mehr, was seinen
   * Bestand wiederherstellen könnte.
   *
   * Bewusst ohne Bestätigungsparameter: die Rückfrage gehört in die
   * Oberfläche, wo der Mensch sitzt.
   */
  app.delete('/all', async (request) => {
    const deleted = app.pause.wipeAll();
    request.log.info({ deleted }, 'Innehalten: alle Daten gelöscht');
    return { deleted };
  });
}

/** Summe über alle Datenarten – ausschließlich für den Zusammenfassungs-Log. */
function countAll(changes) {
  return Object.values(changes ?? {}).reduce((total, list) => total + (list?.length ?? 0), 0);
}
