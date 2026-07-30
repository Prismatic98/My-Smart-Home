/**
 * Client-Seite des Share-Target-Briefkastens.
 *
 * Der Service Worker (public/share-target-sw.js) legt die geteilten Dateien in
 * einen Cache und leitet auf `/files?share=pending` weiter. Hier werden sie
 * abgeholt.
 *
 * WICHTIG: Cache-Name, Präfix und Kopfzeilen stehen doppelt – der Worker kann
 * nichts aus dem Bundle importieren. Änderungen immer in beiden Dateien.
 */

const INBOX_CACHE = 'share-inbox-v1';
const INBOX_PREFIX = '/__share-inbox/';

/**
 * Dateien aus dem Briefkasten holen und ihn dabei leeren.
 *
 * Absichtlich „nehmen" statt „lesen": eine Übergabe darf sich nach einem
 * Neuladen nicht wiederholen. Was der Nutzer im Dialog abbricht, ist weg.
 */
export async function takeSharedFiles() {
  if (!('caches' in window)) return [];
  if (!(await caches.has(INBOX_CACHE))) return [];

  const cache = await caches.open(INBOX_CACHE);
  const keys = [...(await cache.keys())].sort(byIndex);
  const files = [];

  for (const [index, key] of keys.entries()) {
    const response = await cache.match(key);
    if (!response) continue;

    const blob = await response.blob();
    const name = decodeName(response.headers.get('x-share-name')) || fallbackName(blob.type, index);
    const modified = Number(response.headers.get('x-share-modified')) || Date.now();

    files.push(new File([blob], name, { type: blob.type, lastModified: modified }));
  }

  await caches.delete(INBOX_CACHE);
  return files;
}

/** Reihenfolge wie beim Teilen – der Worker nummeriert die Schlüssel durch. */
function byIndex(a, b) {
  return numberOf(a.url) - numberOf(b.url);
}

function numberOf(url) {
  const value = Number(new URL(url).pathname.slice(INBOX_PREFIX.length));
  return Number.isFinite(value) ? value : 0;
}

function decodeName(value) {
  if (!value) return '';
  try {
    return decodeURIComponent(value);
  } catch {
    return '';
  }
}

/**
 * Notname, falls eine Datei ohne Namen ankommt. Die Endung wird aus dem
 * MIME-Typ abgeleitet – ohne sie erkennt der Server den Typ später nicht mehr.
 * Bei `application/octet-stream` gibt es nichts abzuleiten, dann bleibt der
 * Name endungslos statt „…octet-stream".
 */
const GENERIC_TYPES = new Set(['octet-stream', 'unknown']);

function fallbackName(type, index) {
  const subtype = type?.split('/')[1]?.split(/[+;]/)[0];
  const usable = subtype && !GENERIC_TYPES.has(subtype);
  const extension = usable ? `.${subtype === 'jpeg' ? 'jpg' : subtype}` : '';
  return `geteilt-${index + 1}${extension}`;
}
