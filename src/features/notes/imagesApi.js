import { BACKEND_URL, BackendError } from '../../lib/backend.js';

/**
 * Bilder in Notizen – Übertragung zum und vom Backend.
 *
 * Nicht über backendRequest(), weil hier binäre Nutzlast statt JSON läuft:
 * hochgeladen wird als multipart, geladen wird ein Blob.
 */

export function noteImageUrl(id) {
  return `${BACKEND_URL}/notes/images/${encodeURIComponent(id)}`;
}

/** Lädt ein Bild hoch. Der Server ist idempotent, ein zweiter Versuch ist ok. */
export async function uploadNoteImage({ id, noteId, blob }) {
  const form = new FormData();
  // Dateiname nur zur Form – maßgeblich ist der Content-Type des Blobs.
  form.append('file', blob, `${id}`);

  const params = new URLSearchParams({ id, noteId: noteId ?? '' });

  let response;
  try {
    response = await fetch(`${BACKEND_URL}/notes/images?${params}`, {
      method: 'POST',
      body: form,
    });
  } catch (cause) {
    throw new BackendError('Das Bild konnte nicht übertragen werden.', { cause });
  }

  if (!response.ok) {
    throw new BackendError(await describe(response), { status: response.status });
  }

  return response.json();
}

/** Holt die Bytes eines Bildes, das lokal (noch) nicht vorliegt. */
export async function fetchNoteImage(id) {
  let response;
  try {
    response = await fetch(noteImageUrl(id));
  } catch (cause) {
    throw new BackendError('Das Bild ist gerade nicht erreichbar.', { cause });
  }

  if (!response.ok) {
    throw new BackendError(await describe(response), { status: response.status });
  }

  return response.blob();
}

/** Löscht ein Bild. Ebenfalls idempotent. */
export async function deleteNoteImage(id) {
  let response;
  try {
    response = await fetch(noteImageUrl(id), { method: 'DELETE' });
  } catch (cause) {
    throw new BackendError('Das Bild konnte nicht gelöscht werden.', { cause });
  }

  if (!response.ok) {
    throw new BackendError(await describe(response), { status: response.status });
  }
}

async function describe(response) {
  try {
    const payload = await response.json();
    if (payload?.error?.message) return payload.error.message;
  } catch {
    // Kein JSON – Status genügt.
  }
  return `Das Backend antwortete mit ${response.status} ${response.statusText}.`;
}
