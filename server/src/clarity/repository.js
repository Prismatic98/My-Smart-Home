/**
 * Datenzugriff für das Klarblick-Modul – die einzige Stelle, die dafür SQL
 * kennt.
 *
 * Anders als bei den Notizen gibt es hier KEINE inhaltlichen Spalten. Alle
 * sieben Datenarten liegen in einer Tabelle, ihr Inhalt steht als eine
 * einzige Zeichenkette in `payload`, und der Server liest sie nie. Das ist
 * Absicht und nicht Bequemlichkeit:
 *
 *  - Was nicht in Spalten steht, kann nicht versehentlich indiziert,
 *    durchsucht, geloggt oder in einer Fehlermeldung ausgegeben werden. Die
 *    Suche läuft ausschließlich lokal über Dexie.
 *  - Ein neues Feld im Gedankenprotokoll braucht keine Migration. Bei sieben
 *    Datenarten mit zusammen rund hundert Feldern wäre alles andere eine
 *    dauerhafte Baustelle.
 *
 * Der Preis ist, dass der Server nichts über die Daten aussagen kann. Genau
 * das ist bei diesen Daten der gewünschte Zustand.
 */

/**
 * Die Datenarten, die es zum Zeitpunkt des Schreibens gibt – Gegenstück zu
 * SYNC_TABLES in src/features/clarity/model.js.
 *
 * Die Liste ist Dokumentation, KEINE Schranke. Der Server nimmt auch eine
 * Datenart entgegen, die er nicht kennt, und gibt sie unverändert zurück.
 * Andernfalls entstünde bei einem Client, der dem Server voraus ist, eine
 * Endlosschleife: seine Datensätze kämen nie in `settled`, blieben also für
 * immer „ungesendet" und würden bei jedem Lauf erneut hochgeladen. Weil der
 * Inhalt ohnehin undurchsichtig ist, kostet das Durchreichen nichts.
 */
export const RECORD_KINDS = ['thoughtRecords'];

export function createClarityRepository(db) {
  const selectById = db.prepare('SELECT * FROM clarity_records WHERE id = ?');
  const selectWireById = db.prepare(
    'SELECT kind, id, payload, createdAt, updatedAt, deletedAt FROM clarity_records WHERE id = ?'
  );

  // `>=` statt `>`: Der Client merkt sich als Wasserstand die `serverTime` der
  // letzten Antwort. Wird ein Datensatz in genau derselben Millisekunde
  // geschrieben, würde `>` ihn verschlucken. Die Inklusiv-Variante liefert im
  // Zweifel einen Datensatz doppelt – harmlos, weil der Client beim
  // Zurückschreiben ohnehin last-write-wins anwendet.
  const selectChangedSince = db.prepare(`
    SELECT kind, id, payload, createdAt, updatedAt, deletedAt
      FROM clarity_records
     WHERE serverUpdatedAt >= ?
     ORDER BY serverUpdatedAt
  `);

  const insertRecord = db.prepare(`
    INSERT INTO clarity_records (id, kind, payload, createdAt, updatedAt, deletedAt, serverUpdatedAt)
    VALUES (@id, @kind, @payload, @createdAt, @updatedAt, @deletedAt, @serverUpdatedAt)
  `);

  const updateRecord = db.prepare(`
    UPDATE clarity_records
       SET payload = @payload,
           createdAt = @createdAt,
           updatedAt = @updatedAt,
           deletedAt = @deletedAt,
           serverUpdatedAt = @serverUpdatedAt
     WHERE id = @id
  `);

  const deleteAll = db.prepare('DELETE FROM clarity_records');
  const countRecords = db.prepare(
    'SELECT COUNT(*) AS total, COUNT(deletedAt) AS deleted FROM clarity_records'
  );

  /**
   * Alles, was seit `since` (Server-Uhr) geschrieben wurde – inklusive
   * Tombstones –, nach Datenart gruppiert.
   */
  function listChangedSince(since = 0) {
    const changes = {};

    for (const row of selectChangedSince.all(since)) {
      // Eine Datenart, die dieser Server nicht kennt, kann nur von einem
      // neueren Client stammen. Weglassen wäre stiller Datenverlust –
      // durchreichen kostet nichts, weil der Inhalt ohnehin undurchsichtig ist.
      (changes[row.kind] ??= []).push(toWire(row));
    }

    return changes;
  }

  /**
   * Übernimmt die Datensätze eines Clients per last-write-wins.
   *
   * Rückgabe:
   *  - `settled`:  IDs je Datenart, bei denen der Client-Stand gewonnen hat
   *    oder identisch war. Die müssen nicht zurückgeschickt werden.
   *  - `rejected`: IDs, bei denen der Server neuer war. Deren Fassung muss der
   *    Client zwingend bekommen – siehe Kommentar in routes/clarity.js.
   *  - `applied`:  Anzahl der tatsächlich geschriebenen Zeilen.
   */
  const applyIncoming = db.transaction((changes, now) => {
    const settled = {};
    const rejected = [];
    let applied = 0;

    // Über die gelieferten Schlüssel laufen, nicht über RECORD_KINDS – siehe
    // den Kommentar dort.
    for (const [kind, incoming] of Object.entries(changes)) {
      if (!Array.isArray(incoming) || incoming.length === 0) continue;

      const accepted = new Set();

      for (const record of incoming) {
        const row = normalize(kind, record);
        const existing = selectById.get(row.id);

        if (!existing) {
          insertRecord.run({ ...row, serverUpdatedAt: now });
          accepted.add(row.id);
          applied += 1;
          continue;
        }

        if (row.updatedAt > existing.updatedAt) {
          updateRecord.run({ ...row, serverUpdatedAt: now });
          accepted.add(row.id);
          applied += 1;
          continue;
        }

        if (row.updatedAt === existing.updatedAt) {
          // Gleicher Stand – nichts zu tun, aber auch nichts zurückzuschicken.
          accepted.add(row.id);
          continue;
        }

        // existing.updatedAt ist größer: der Server gewinnt.
        rejected.push({ kind: existing.kind, id: row.id });
      }

      settled[kind] = accepted;
    }

    return { settled, rejected, applied };
  });

  /** Ein einzelner Datensatz in der Form, die über die Leitung geht. */
  function getById(id) {
    const row = selectWireById.get(id);
    return row ? { kind: row.kind, record: toWire(row) } : null;
  }

  /**
   * Komplettlöschung: echtes DELETE, keine Tombstones.
   *
   * Die einzige Stelle in der gesamten Anwendung, die hart löscht. Begründung
   * steht in CLAUDE.md: bei diesen Daten muss „weg" auch weg heißen, und ein
   * Tombstone, der die Zeile bestehen lässt, erfüllt das nicht.
   */
  function wipeAll() {
    return deleteAll.run().changes;
  }

  function stats() {
    return countRecords.get();
  }

  return { listChangedSince, applyIncoming, getById, wipeAll, stats };
}

/** Die Zeile, wie sie über die Leitung geht – `kind` steckt in der Gruppierung. */
function toWire(row) {
  return {
    id: row.id,
    payload: row.payload,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    deletedAt: row.deletedAt,
  };
}

/**
 * Füllt optionale Felder auf, damit die Statements immer denselben
 * Parametersatz bekommen (better-sqlite3 verlangt exakt passende Namen).
 *
 * Ein Tombstone bekommt hier zusätzlich seinen Inhalt genommen. Der Client
 * schickt bereits `{}`; diese Zeile ist die Absicherung dafür, dass gelöschte
 * Datensätze auf dem Pi unter keinen Umständen mit Inhalt liegen bleiben.
 */
function normalize(kind, record) {
  return {
    id: record.id,
    kind,
    payload: record.deletedAt == null ? (record.payload ?? '{}') : '{}',
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    deletedAt: record.deletedAt ?? null,
  };
}
