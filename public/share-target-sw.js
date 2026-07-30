/**
 * Web Share Target: Dateien aus dem Teilen-Menü des Systems annehmen.
 *
 * Dieses Skript wird per `workbox.importScripts` in den generierten Service
 * Worker eingebunden (siehe vite.config.js). Es liegt in `public/`, weil es
 * unverändert und unter einem festen Namen ausgeliefert werden muss – ein
 * Modul aus `src/` bekäme einen Hash im Dateinamen.
 *
 * Ablauf: Android schickt die geteilten Dateien als POST mit
 * multipart/form-data an `action` aus dem Manifest. Ein POST kann eine
 * Single-Page-App nicht selbst beantworten – der Request landet nie im
 * JavaScript der Seite. Deshalb fängt ihn der Service Worker ab, legt die
 * Dateien in einen Cache und antwortet mit einer Weiterleitung (303) auf eine
 * normale GET-Route. Erst die geladene Seite holt die Dateien aus dem Cache
 * und lädt sie hoch.
 *
 * Warum Cache Storage und nicht IndexedDB: hier soll nur ein Blob mit Namen
 * und MIME-Typ von A nach B wandern. Genau dafür ist ein Response-Objekt
 * gemacht; eine Datenbank samt Schema wäre für einen Briefkasten zu viel.
 *
 * WICHTIG: `INBOX_CACHE`, das Präfix und die Namen der Kopfzeilen stehen ein
 * zweites Mal in src/features/files/shareTarget.js. Der Service Worker kann
 * nichts aus dem App-Bundle importieren, deshalb müssen beide Seiten
 * zusammen geändert werden.
 */

const INBOX_CACHE = 'share-inbox-v1';
const INBOX_PREFIX = '/__share-inbox/';

/** Muss zu `share_target.action` im Manifest passen. */
const SHARE_TARGET_PATH = '/share-target';

/**
 * Der Fetch-Handler wird beim Import registriert – also vor dem Routing von
 * Workbox. Für POST-Requests ist das ohnehin unkritisch: Workbox-Routen gelten
 * ausschließlich für GET, sie würden diesen Request nie beantworten.
 */
self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'POST') return;
  if (new URL(request.url).pathname !== SHARE_TARGET_PATH) return;

  event.respondWith(receiveShare(request));
});

async function receiveShare(request) {
  try {
    const formData = await request.formData();

    // Der Feldname stammt aus `share_target.params.files[].name` im Manifest.
    const files = formData
      .getAll('files')
      .filter((value) => value instanceof File && value.size > 0);

    if (files.length === 0) return redirectTo('files?share=empty');

    await stash(files);
    return redirectTo('files?share=pending');
  } catch {
    // Eine kaputte Übergabe darf nicht in einer weißen Seite enden: die App
    // öffnet sich trotzdem und sagt, dass nichts angekommen ist.
    return redirectTo('files?share=failed');
  }
}

/**
 * Dateien in den Briefkasten legen.
 *
 * Reste einer abgebrochenen Übergabe fliegen vorher raus: geteilt wird immer
 * ein kompletter Schwung, niemals eine Fortsetzung. Sonst würden Dateien
 * auftauchen, die der Nutzer beim letzten Mal absichtlich verworfen hat.
 */
async function stash(files) {
  const cache = await caches.open(INBOX_CACHE);
  for (const key of await cache.keys()) await cache.delete(key);

  for (const [index, file] of files.entries()) {
    const key = new URL(`${INBOX_PREFIX}${index}`, self.registration.scope).href;

    await cache.put(
      new Request(key),
      new Response(file, {
        headers: {
          // Kopfzeilen dürfen nur Latin-1 enthalten, Dateinamen aber alles –
          // deshalb prozentkodiert. Die Seite dekodiert wieder.
          'content-type': file.type || 'application/octet-stream',
          'x-share-name': encodeURIComponent(file.name || ''),
          'x-share-modified': String(file.lastModified || 0),
        },
      })
    );
  }
}

function redirectTo(path) {
  return Response.redirect(new URL(path, self.registration.scope).href, 303);
}
