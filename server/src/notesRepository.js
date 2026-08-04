/**
 * Datenzugriff für Notizen – die einzige Stelle, die SQL kennt.
 *
 * Alle Statements werden einmal vorbereitet (better-sqlite3 ist synchron,
 * prepared statements sind hier der übliche Weg und kosten nichts).
 */

/** Spalten, die der Client sehen darf – `serverUpdatedAt` ist rein intern. */
const WIRE_COLUMNS = 'id, title, body, kind, createdAt, updatedAt, deletedAt, pinned';

export function createNotesRepository(db) {
  const selectById = db.prepare('SELECT * FROM notes WHERE id = ?');
  const selectWireById = db.prepare(`SELECT ${WIRE_COLUMNS} FROM notes WHERE id = ?`);

  // `>=` statt `>`: Der Client merkt sich als Wasserstand die `serverTime` der
  // letzten Antwort. Wird eine Notiz in genau derselben Millisekunde
  // geschrieben, würde `>` sie verschlucken. Die Inklusiv-Variante liefert im
  // Zweifel einen Datensatz doppelt – das ist harmlos, weil der Client beim
  // Zurückschreiben ohnehin last-write-wins anwendet.
  const selectChangedSince = db.prepare(
    `SELECT ${WIRE_COLUMNS} FROM notes WHERE serverUpdatedAt >= ? ORDER BY serverUpdatedAt`
  );

  const insertNote = db.prepare(`
    INSERT INTO notes (id, title, body, kind, createdAt, updatedAt, deletedAt, pinned, serverUpdatedAt)
    VALUES (@id, @title, @body, @kind, @createdAt, @updatedAt, @deletedAt, @pinned, @serverUpdatedAt)
  `);

  const updateNote = db.prepare(`
    UPDATE notes
       SET title = @title,
           body = @body,
           kind = @kind,
           createdAt = @createdAt,
           updatedAt = @updatedAt,
           deletedAt = @deletedAt,
           pinned = @pinned,
           serverUpdatedAt = @serverUpdatedAt
     WHERE id = @id
  `);

  const countNotes = db.prepare(
    'SELECT COUNT(*) AS total, COUNT(deletedAt) AS deleted FROM notes'
  );

  /** Alles, was seit `since` (Server-Uhr) geschrieben wurde – inkl. Tombstones. */
  function listChangedSince(since = 0) {
    return selectChangedSince.all(since);
  }

  /**
   * Übernimmt die Notizen eines Clients per last-write-wins.
   *
   * Rückgabe:
   *  - `settled`:  IDs, bei denen der Client-Stand gewonnen hat oder identisch
   *    war. Die müssen nicht zurückgeschickt werden.
   *  - `rejected`: IDs, bei denen der Server neuer war. Deren Fassung muss der
   *    Client zwingend bekommen – siehe Kommentar in routes/notes.js.
   *  - `applied`:  Anzahl der tatsächlich geschriebenen Zeilen.
   */
  const applyIncoming = db.transaction((notes, now) => {
    const settled = new Set();
    const rejected = [];
    let applied = 0;

    for (const incoming of notes) {
      const note = normalize(incoming);
      const existing = selectById.get(note.id);

      if (!existing) {
        insertNote.run({ ...note, serverUpdatedAt: now });
        settled.add(note.id);
        applied += 1;
        continue;
      }

      if (note.updatedAt > existing.updatedAt) {
        updateNote.run({ ...note, serverUpdatedAt: now });
        settled.add(note.id);
        applied += 1;
        continue;
      }

      if (note.updatedAt === existing.updatedAt) {
        // Gleicher Stand – nichts zu tun, aber auch nichts zurückzuschicken.
        settled.add(note.id);
        continue;
      }

      // existing.updatedAt ist größer: der Server gewinnt.
      rejected.push(note.id);
    }

    return { settled, rejected, applied };
  });

  /** Eine einzelne Notiz in der Form, die über die Leitung geht. */
  function getById(id) {
    return selectWireById.get(id);
  }

  function stats() {
    return countNotes.get();
  }

  return { listChangedSince, applyIncoming, getById, stats };
}

/**
 * Füllt optionale Felder auf, damit die Statements immer denselben
 * Parametersatz bekommen (better-sqlite3 verlangt exakt passende Namen).
 */
function normalize(note) {
  return {
    id: note.id,
    title: note.title ?? '',
    body: note.body ?? '',
    // Unbekannte Werte werden zu 'text': lieber ein lesbares Textdokument als
    // eine Notiz, die der Client keiner Ansicht zuordnen kann.
    kind: note.kind === 'list' ? 'list' : 'text',
    createdAt: note.createdAt,
    updatedAt: note.updatedAt,
    deletedAt: note.deletedAt ?? null,
    // SQLite kennt keinen Boolean – 0/1, wie auf der Client-Seite auch.
    pinned: note.pinned ? 1 : 0,
  };
}