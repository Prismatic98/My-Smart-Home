import { useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNetwork } from '@mantine/hooks';

import { syncClarity } from './claritySync.js';

/**
 * Hängt den Klarblick-Sync an TanStack Query – dieselbe Konstruktion wie beim
 * Notizen-Sync und aus denselben Gründen.
 *
 * Gebraucht werden genau die Auslöser, die Query mitbringt: einmal beim Mount,
 * danach im Intervall, und wieder, sobald das Netz zurück ist. Der Aufruf ist
 * zwar schreibend, aus Sicht des Clients aber ein Abholen – er liefert den
 * neuen Server-Stand zurück.
 *
 * Die Oberfläche hängt NICHT an dieser Query, sondern liest über useLiveQuery
 * aus Dexie. Der Sync schreibt nur nach IndexedDB. Genau deshalb funktioniert
 * das Modul vollständig ohne Backend – bei diesem Modul ist das der Normalfall
 * und keine Randbedingung.
 */

/** Abstand zwischen zwei Läufen, solange die App im Vordergrund ist. */
export const SYNC_INTERVAL = 60_000;

export const claritySyncQueryKey = ['clarity', 'sync'];

export function useClaritySync() {
  const { online } = useNetwork();

  const query = useQuery({
    queryKey: claritySyncQueryKey,
    queryFn: ({ signal }) => syncClarity({ signal }),

    staleTime: 0,
    gcTime: Infinity,

    refetchInterval: SYNC_INTERVAL,
    // Im Hintergrund-Tab nicht tickern – die PWA soll das Handy nicht wecken.
    refetchIntervalInBackground: false,
    refetchOnReconnect: 'always',
    refetchOnWindowFocus: 'always',
    refetchOnMount: 'always',

    // Offline gar nicht erst versuchen; Query stellt den Lauf zurück, bis das
    // online-Event kommt.
    networkMode: 'online',
    retry: 1,
  });

  const { refetch } = query;
  const sync = useCallback(() => refetch(), [refetch]);

  return {
    status: deriveStatus({ online, query }),
    /** Zeitpunkt des letzten erfolgreichen Syncs (lokale Uhr), 0 = noch keiner. */
    lastSyncedAt: query.dataUpdatedAt,
    lastResult: query.data ?? null,
    error: query.error ?? null,
    sync,
  };
}

/** 'offline' | 'syncing' | 'error' | 'ok' | 'idle' */
function deriveStatus({ online, query }) {
  if (!online) return 'offline';
  if (query.isFetching) return 'syncing';
  if (query.isError) return 'error';
  if (query.dataUpdatedAt > 0) return 'ok';
  return 'idle';
}
