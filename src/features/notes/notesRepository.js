import { db } from './db.js';

/**
 * Datenzugriffsschicht für Notizen – die einzige Stelle, die Dexie direkt anspricht.
 * Komponenten nutzen stattdessen die Hooks aus useNotes.js.
 */

function newId() {
  // crypto.randomUUID gibt es nur in sicheren Kontexten (https/localhost).
  // Über Tailscale läuft die App mit HTTPS, der Fallback ist reine Vorsicht.
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `note-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
}

/** Alle Notizen, zuletzt bearbeitete zuerst. */
export function listNotes() {
  return db.notes.orderBy('updatedAt').reverse().toArray();
}

/** Eine einzelne Notiz oder undefined. */
export function getNote(id) {
  return db.notes.get(id);
}

/**
 * Legt eine Notiz an und gibt sie zurück.
 * @param {{ title?: string, body?: string }} input
 */
export async function createNote({ title = '', body = '' } = {}) {
  const now = Date.now();
  const note = {
    id: newId(),
    title: title.trim(),
    body,
    createdAt: now,
    updatedAt: now,
  };
  await db.notes.add(note);
  return note;
}

/**
 * Aktualisiert Titel und/oder Text. `updatedAt` wird immer mitgeschrieben.
 * @param {string} id
 * @param {{ title?: string, body?: string }} changes
 */
export async function updateNote(id, changes) {
  const patch = { updatedAt: Date.now() };
  if (changes.title !== undefined) patch.title = changes.title.trim();
  if (changes.body !== undefined) patch.body = changes.body;

  const updated = await db.notes.update(id, patch);
  if (updated === 0) {
    throw new Error(`Notiz ${id} existiert nicht (mehr).`);
  }
  return patch;
}

/** Löscht eine Notiz. */
export function deleteNote(id) {
  return db.notes.delete(id);
}