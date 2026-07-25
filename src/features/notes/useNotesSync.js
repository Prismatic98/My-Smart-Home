import { useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNetwork } from '@mantine/hooks';

import { syncNotes } from './notesSync.js';

/**
 * Hängt den Notizen-Sync an TanStack Query.
 *
 * Warum useQuery und nicht useMutation, obwohl der Sync per POST läuft:
 * gebraucht werden genau die Auslöser, die Query mitbringt – einmal beim
 * Mount, danach im Intervall, und wieder, sobald das Netz zurück ist. Mit
 * einer Mutation müsste man Timer, online-Listener und ein Sperre gegen
 * überlappende Läufe selbst bauen. Der Aufruf ist zwar schreibend, aus Sicht
 * des Clients aber ein Abholen: er liefert den neuen Server-Stand zurück.
 *
 * Die UI hängt NICHT an dieser Query – sie liest über useLiveQuery aus Dexie.
 * Der Sync schreibt nur nach IndexedDB, und Dexie rendert die Liste neu.
 * Genau deshalb funktioniert die App vollständig ohne Backend.
 */

/** Abstand zwischen zwei Läufen, solange die App im Vordergrund ist. */
export const SYNC_INTERVAL = 60_000;

export const notesSyncQueryKey = ['notes', 'sync'];

export function useNotesSync() {
  const { online } = useNetwork();

  const query = useQuery({
    queryKey: notesSyncQueryKey,
    queryFn: ({ signal }) => syncNotes({ signal }),

    // Der globale staleTime von 30 s würde das Nachsynchronisieren beim
    // Zurückkehren in die App ausbremsen.
    staleTime: 0,
    gcTime: Infinity,

    refetchInterval: SYNC_INTERVAL,
    // Im Hintergrund-Tab nicht tickern – die PWA soll das Handy nicht wecken.
    refetchIntervalInBackground: false,
    // Netz wieder da bzw. App wieder im Vordergrund: sofort nachziehen.
    // Letzteres fängt die Lücke, die durch das pausierte Intervall entsteht.
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
