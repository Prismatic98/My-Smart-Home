import { useCallback, useEffect, useRef, useState } from 'react';
import { notifications } from '@mantine/notifications';

import { uploadUrl } from './api.js';

/**
 * Warteschlange für Uploads mit Fortschritt pro Datei.
 *
 * Warum XMLHttpRequest und nicht fetch: fetch meldet keinen Upload-Fortschritt.
 * Es gibt zwar Request-Streams, die sind aber an HTTP/2 und Feature-Flags
 * gebunden – XHR ist hier schlicht das Werkzeug, das die Aufgabe löst.
 *
 * Ein Request = eine Datei. Dadurch hat jede Datei ihren eigenen Fortschritt,
 * ihren eigenen Abbruch und ihren eigenen Fehler.
 */

/** Mehr parallele Uploads bringen über eine Haushaltsleitung nichts. */
const MAX_PARALLEL = 3;

/**
 * Fenster für die Ratenberechnung. Die naive Gesamtrate (Bytes / Gesamtzeit)
 * springt am Anfang stark und reagiert später gar nicht mehr auf Einbrüche;
 * ein gleitendes Fenster über die letzten Sekunden ist deutlich ruhiger.
 */
const RATE_WINDOW_MS = 5_000;

/** 'queued' | 'uploading' | 'done' | 'error' | 'canceled' */
const ACTIVE = new Set(['queued', 'uploading']);

export function useUploadQueue({ onFileUploaded } = {}) {
  const [items, setItems] = useState([]);

  const requests = useRef(new Map());
  const samples = useRef(new Map());
  const started = useRef(new Set());
  const uploadedCallback = useRef(onFileUploaded);

  uploadedCallback.current = onFileUploaded;

  const patch = useCallback((id, changes) => {
    setItems((current) =>
      current.map((item) => (item.id === id ? { ...item, ...changes } : item))
    );
  }, []);

  /** Dateien in die Warteschlange stellen. Der Zielordner wird festgehalten. */
  const enqueue = useCallback((files, targetPath) => {
    const added = Array.from(files).map((file) => ({
      id: crypto.randomUUID(),
      file,
      name: file.name,
      size: file.size,
      targetPath,
      status: 'queued',
      loaded: 0,
      percent: 0,
      bytesPerSecond: null,
      etaSeconds: null,
      finalName: null,
      error: null,
    }));

    if (added.length > 0) setItems((current) => [...current, ...added]);
    return added.length;
  }, []);

  const cancel = useCallback((id) => {
    const request = requests.current.get(id);
    if (request) {
      // löst onabort aus, der den Status setzt
      request.abort();
      return;
    }
    // Noch nicht gestartet: direkt aus der Schlange nehmen.
    patch(id, { status: 'canceled' });
    started.current.add(id);
  }, [patch]);

  const remove = useCallback((id) => {
    requests.current.get(id)?.abort();
    setItems((current) => current.filter((item) => item.id !== id));
  }, []);

  /** Alles Abgeschlossene aus der Liste räumen, Laufendes bleibt. */
  const clearFinished = useCallback(() => {
    setItems((current) => current.filter((item) => ACTIVE.has(item.status)));
  }, []);

  const cancelAll = useCallback(() => {
    for (const request of requests.current.values()) request.abort();
    setItems((current) =>
      current.map((item) => (ACTIVE.has(item.status) ? { ...item, status: 'canceled' } : item))
    );
  }, []);

  const startUpload = useCallback(
    (item) => {
      started.current.add(item.id);
      samples.current.set(item.id, [{ at: performance.now(), loaded: 0 }]);

      const request = new XMLHttpRequest();
      requests.current.set(item.id, request);

      request.open('POST', uploadUrl(item.targetPath));
      request.responseType = 'json';

      request.upload.addEventListener('progress', (event) => {
        if (!event.lengthComputable) return;

        const now = performance.now();
        const recent = samples.current.get(item.id) ?? [];
        recent.push({ at: now, loaded: event.loaded });
        // Alles außerhalb des Fensters verwerfen, aber immer einen
        // Bezugspunkt behalten.
        while (recent.length > 2 && now - recent[0].at > RATE_WINDOW_MS) recent.shift();
        samples.current.set(item.id, recent);

        const oldest = recent[0];
        const elapsed = (now - oldest.at) / 1000;
        const transferred = event.loaded - oldest.loaded;
        const rate = elapsed >= 0.5 && transferred > 0 ? transferred / elapsed : null;

        patch(item.id, {
          loaded: event.loaded,
          percent: event.total ? Math.round((event.loaded / event.total) * 100) : 0,
          bytesPerSecond: rate,
          etaSeconds: rate ? (event.total - event.loaded) / rate : null,
        });
      });

      const finish = (changes) => {
        requests.current.delete(item.id);
        samples.current.delete(item.id);
        patch(item.id, changes);
      };

      request.addEventListener('load', () => {
        if (request.status >= 200 && request.status < 300) {
          const result = request.response ?? {};
          finish({
            status: 'done',
            percent: 100,
            loaded: item.size,
            etaSeconds: null,
            finalName: result.name ?? item.name,
          });
          uploadedCallback.current?.({ ...result, targetPath: item.targetPath });
          return;
        }

        finish({ status: 'error', error: messageFor(request) });
      });

      request.addEventListener('error', () =>
        finish({ status: 'error', error: 'Die Verbindung zum Backend ist abgerissen.' })
      );
      request.addEventListener('timeout', () =>
        finish({ status: 'error', error: 'Zeitüberschreitung beim Upload.' })
      );
      request.addEventListener('abort', () => finish({ status: 'canceled', etaSeconds: null }));

      const form = new FormData();
      form.append('file', item.file, item.file.name);
      request.send(form);

      patch(item.id, { status: 'uploading' });
    },
    [patch]
  );

  // Nachrücken: sobald ein Platz frei wird, startet der nächste Eintrag.
  useEffect(() => {
    const running = items.filter((item) => item.status === 'uploading').length;
    let free = MAX_PARALLEL - running;
    if (free <= 0) return;

    for (const item of items) {
      if (free === 0) break;
      if (item.status !== 'queued' || started.current.has(item.id)) continue;
      startUpload(item);
      free -= 1;
    }
  }, [items, startUpload]);

  // Beim Verlassen der Seite laufende Uploads nicht abbrechen – sie sollen
  // fertig werden. Nur die Referenzen freigeben.
  useEffect(() => () => requests.current.clear(), []);

  /**
   * Zusammenfassung, sobald die Schlange leer läuft. `reported` verhindert,
   * dass ein zweiter Schwung die Ergebnisse des ersten noch einmal meldet.
   */
  const reported = useRef(new Set());

  useEffect(() => {
    if (items.some((item) => ACTIVE.has(item.status))) return;

    const fresh = items.filter((item) => !reported.current.has(item.id));
    if (fresh.length === 0) return;
    for (const item of fresh) reported.current.add(item.id);

    const uploaded = fresh.filter((item) => item.status === 'done');
    const failed = fresh.filter((item) => item.status === 'error');
    const renamed = uploaded.filter((item) => item.finalName && item.finalName !== item.name);

    if (uploaded.length > 0) {
      notifications.show({
        color: 'teal',
        title: `${uploaded.length} ${plural(uploaded.length, 'Datei', 'Dateien')} hochgeladen`,
        message:
          renamed.length > 0
            ? `Umbenannt wegen Namensgleichheit: ${renamed
                .map((item) => `${item.name} → ${item.finalName}`)
                .join(', ')}`
            : uploaded.map((item) => item.finalName ?? item.name).join(', '),
      });
    }

    // Fehler bleiben stehen, bis sie jemand wegklickt.
    if (failed.length > 0) {
      notifications.show({
        color: 'red',
        autoClose: false,
        title: `${failed.length} ${plural(failed.length, 'Upload', 'Uploads')} fehlgeschlagen`,
        message: failed.map((item) => `${item.name}: ${item.error}`).join('\n'),
      });
    }
  }, [items]);

  const active = items.filter((item) => ACTIVE.has(item.status));

  return {
    items,
    activeCount: active.length,
    /** Gesamtfortschritt über alle laufenden Uploads, für die Kopfzeile des Panels. */
    overallPercent: overallProgress(active),
    enqueue,
    cancel,
    cancelAll,
    remove,
    clearFinished,
  };
}

function overallProgress(active) {
  if (active.length === 0) return 100;
  const total = active.reduce((sum, item) => sum + item.size, 0);
  if (total === 0) return 0;
  const loaded = active.reduce((sum, item) => sum + item.loaded, 0);
  return Math.round((loaded / total) * 100);
}

function plural(count, singular, pluralForm) {
  return count === 1 ? singular : pluralForm;
}

/** Die Fehlermeldung des Servers hat Vorrang – sie ist für Menschen geschrieben. */
function messageFor(request) {
  const payload = request.response;
  if (payload?.error?.message) return payload.error.message;
  if (request.status === 413) return 'Die Datei ist zu groß.';
  if (request.status === 0) return 'Keine Verbindung zum Backend.';
  return `Der Upload ist fehlgeschlagen (Status ${request.status}).`;
}
