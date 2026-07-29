import { useEffect, useState } from 'react';

import { fetchNoteImage } from './imagesApi.js';
import { cacheNoteImage, getNoteImage } from './notesRepository.js';

/**
 * Löst eine Bild-ID in eine anzeigbare URL auf.
 *
 * Reihenfolge: erst lokal in IndexedDB nachsehen, sonst vom Backend holen und
 * dabei lokal ablegen. Ein Bild wird also genau einmal pro Gerät übertragen –
 * und ein selbst eingefügtes gar nicht, weil es schon da ist.
 *
 * Die Object-URL gehört zu diesem Hook-Aufruf und wird beim Aufräumen wieder
 * freigegeben, sonst hält der Browser den Blob bis zum Neuladen im Speicher.
 *
 * @returns {{ url: string|null, status: 'loading'|'ready'|'error', error: Error|null }}
 */
export function useNoteImage(imageId) {
  const [state, setState] = useState({ url: null, status: 'loading', error: null });

  useEffect(() => {
    if (!imageId) {
      setState({ url: null, status: 'error', error: new Error('Kein Bild angegeben.') });
      return undefined;
    }

    let cancelled = false;
    let objectUrl = null;

    setState({ url: null, status: 'loading', error: null });

    (async () => {
      const local = await getNoteImage(imageId);
      let blob = local?.blob;

      if (!blob) {
        blob = await fetchNoteImage(imageId);
        // Nur ablegen, wenn die Komponente noch lebt – sonst hätte ein
        // Durchblättern schnell den Speicher mit Blobs gefüllt.
        if (cancelled) return;
        await cacheNoteImage({ id: imageId, noteId: local?.noteId, blob });
      }

      if (cancelled) return;
      objectUrl = URL.createObjectURL(blob);
      setState({ url: objectUrl, status: 'ready', error: null });
    })().catch((error) => {
      if (!cancelled) setState({ url: null, status: 'error', error });
    });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [imageId]);

  return state;
}
