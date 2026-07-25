/**
 * Zugang zum eigenen Backend (aktuell: Notizen-Sync, später Datei-Upload).
 *
 * Die Basis-URL kommt aus VITE_BACKEND_URL und ist standardmäßig der relative
 * Pfad `/backend`. Damit ist es in beiden Umgebungen dieselbe Origin und es
 * braucht kein CORS:
 *
 *  - Dev:        der Vite-Proxy leitet /backend auf localhost:3001 um
 *                (server.proxy in vite.config.js).
 *  - Produktion: Caddy reicht /backend/* an den Server-Container weiter
 *                und schneidet das Präfix ab.
 */

export const BACKEND_URL = (import.meta.env.VITE_BACKEND_URL ?? '/backend')
  .trim()
  .replace(/\/+$/, '');

/** Nach dieser Zeit gilt ein Request als gescheitert. */
const DEFAULT_TIMEOUT = 15_000;

/** Fehler mit HTTP-Status, damit Aufrufer zwischen 4xx und 5xx unterscheiden können. */
export class BackendError extends Error {
  constructor(message, { status = 0, cause } = {}) {
    super(message, { cause });
    this.name = 'BackendError';
    this.status = status;
  }
}

/**
 * Ruft das Backend auf und gibt die JSON-Antwort zurück.
 * Wirft BackendError – nie ein rohes fetch-Reject, damit die UI immer einen
 * verständlichen Text hat.
 */
export async function backendRequest(path, { method = 'GET', body, signal } = {}) {
  const url = `${BACKEND_URL}${path}`;

  // Ohne Timeout hängt ein Request bei einem stehenden Server praktisch ewig.
  const timeout = AbortSignal.timeout(DEFAULT_TIMEOUT);
  const combined = signal ? AbortSignal.any([signal, timeout]) : timeout;

  let response;
  try {
    response = await fetch(url, {
      method,
      signal: combined,
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (cause) {
    if (signal?.aborted) throw cause;
    if (timeout.aborted) {
      throw new BackendError('Das Backend hat nicht rechtzeitig geantwortet.', { cause });
    }
    throw new BackendError('Das Backend ist nicht erreichbar.', { cause });
  }

  if (!response.ok) {
    throw new BackendError(await describeHttpError(response), { status: response.status });
  }

  return response.json();
}

/** Holt die Fehlermeldung aus dem Body, wenn der Server eine mitschickt. */
async function describeHttpError(response) {
  let detail = '';
  try {
    const payload = await response.json();
    detail = payload?.message || payload?.error || '';
  } catch {
    // Kein JSON – dann reicht der Status.
  }
  return detail
    ? `Backend antwortete mit ${response.status}: ${detail}`
    : `Backend antwortete mit ${response.status} ${response.statusText}.`;
}
