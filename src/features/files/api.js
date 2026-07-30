import { BACKEND_URL, backendRequest } from '../../lib/backend.js';

/**
 * Aufrufe der Dateiablage.
 *
 * Anders als die Notizen gibt es hier keine lokale Kopie: jeder Aufruf fragt
 * den echten Zustand des Dateisystems auf dem Pi ab. Deshalb ist TanStack
 * Query die einzige Datenschicht – kein Dexie, kein Sync.
 */

const query = (params) => new URLSearchParams(params).toString();

/** Inhalt eines Verzeichnisses. */
export function listDirectory(path) {
  return backendRequest(`/files/list?${query({ path })}`);
}

/** Belegter/freier Speicher des Datenträgers. */
export function fetchUsage() {
  return backendRequest('/files/usage');
}

/** Neuen Ordner anlegen. */
export function createFolder({ path, name }) {
  return backendRequest('/files/mkdir', { method: 'POST', body: { path, name } });
}

/** Datei oder Ordner umbenennen. `path` ist der volle Pfad des Eintrags. */
export function renameEntry({ path, newName }) {
  return backendRequest('/files/rename', { method: 'PATCH', body: { path, newName } });
}

/** In einen anderen Ordner verschieben. `targetPath` ist der Zielordner. */
export function moveEntry({ path, targetPath }) {
  return backendRequest('/files/move', { method: 'PATCH', body: { path, targetPath } });
}

/** Datei oder Ordner löschen (Ordner samt Inhalt). */
export function deleteEntry(path) {
  return backendRequest(`/files/entry?${query({ path })}`, { method: 'DELETE' });
}

/**
 * URL für Download bzw. Upload.
 *
 * Der Download läuft bewusst nicht über fetch, sondern über einen normalen
 * Link: so übernimmt der Browser die Fortschrittsanzeige, das Speichern-unter
 * und – bei großen Dateien – das Streamen, ohne dass die Datei je durch den
 * JavaScript-Heap muss.
 */
export function downloadUrl(path) {
  return `${BACKEND_URL}/files/download?${query({ path })}`;
}

export function uploadUrl(path) {
  return `${BACKEND_URL}/files/upload?${query({ path })}`;
}

/**
 * Dieselben Bytes wie `downloadUrl`, aber mit `Content-Disposition: inline`.
 *
 * Für <img>/<video> macht das keinen Unterschied – dort ignoriert der Browser
 * die Kopfzeile. Entscheidend ist sie beim Öffnen in einem neuen Tab: mit
 * `attachment` würde daraus ein Download statt einer Anzeige.
 */
export function previewUrl(path) {
  return `${BACKEND_URL}/files/download?${query({ path, inline: true })}`;
}

/** Löst den Download aus, ohne die Seite zu verlassen. */
export function triggerDownload(path, name) {
  const link = document.createElement('a');
  link.href = downloadUrl(path);
  link.download = name ?? '';
  document.body.append(link);
  link.click();
  link.remove();
}

/** Pfad zusammensetzen – immer mit Slashes, nie mit doppelten. */
export function joinPath(parent, name) {
  const base = parent === '/' || !parent ? '' : parent.replace(/\/+$/, '');
  return `${base}/${name}`;
}

/** Elternpfad eines Pfades ("/a/b/c" -> "/a/b"). */
export function parentPath(path) {
  const segments = path.split('/').filter(Boolean);
  segments.pop();
  return segments.length ? `/${segments.join('/')}` : '/';
}
