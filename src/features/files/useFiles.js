import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  createFolder,
  deleteEntry,
  fetchUsage,
  joinPath,
  listDirectory,
  moveEntry,
  renameEntry,
} from './api.js';

/**
 * TanStack-Query-Schicht der Dateiablage.
 *
 * Dateien sind reine Server-Daten – hier ist Query nicht nur erlaubt, sondern
 * die richtige Abstraktion: Cache pro Ordner, Invalidierung nach Änderungen,
 * Ladezustände frei Haus.
 */

export const filesKeys = {
  all: ['files'],
  list: (path) => ['files', 'list', path],
  usage: () => ['files', 'usage'],
};

/** Inhalt des aktuellen Ordners. */
export function useDirectory(path) {
  return useQuery({
    queryKey: filesKeys.list(path),
    queryFn: () => listDirectory(path),
    // Nach einem Wechsel zurück in einen Ordner kurz die alten Daten zeigen,
    // aber im Hintergrund nachladen – das Dateisystem kann sich jederzeit
    // geändert haben (anderes Gerät, Upload von woanders).
    staleTime: 5_000,
    placeholderData: (previous) => previous,
  });
}

/** Belegung des Datenträgers für die Fußzeile. */
export function useStorageUsage() {
  return useQuery({
    queryKey: filesKeys.usage(),
    queryFn: fetchUsage,
    staleTime: 60_000,
  });
}

/** Ordner anlegen. Kein optimistisches Update – der Name kann kollidieren (409). */
export function useCreateFolder(path) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (name) => createFolder({ path, name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: filesKeys.list(path) });
    },
  });
}

/**
 * Umbenennen mit optimistischem Update.
 *
 * Der neue Name steht sofort in der Liste; scheitert der Aufruf (z. B. 409),
 * wird der Schnappschuss zurückgerollt. Das ist hier ungefährlich, weil die
 * Antwort nur Erfolg oder Fehler kennt und nichts nachliefert, was wir nicht
 * schon wüssten.
 */
export function useRenameEntry(path) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ entry, newName }) => renameEntry({ path: joinPath(path, entry.name), newName }),

    onMutate: async ({ entry, newName }) => {
      await queryClient.cancelQueries({ queryKey: filesKeys.list(path) });
      const snapshot = queryClient.getQueryData(filesKeys.list(path));

      queryClient.setQueryData(filesKeys.list(path), (current) =>
        current
          ? {
              ...current,
              entries: current.entries.map((item) =>
                item.name === entry.name ? { ...item, name: newName } : item
              ),
            }
          : current
      );

      return { snapshot };
    },

    onError: (_error, _variables, context) => {
      if (context?.snapshot) queryClient.setQueryData(filesKeys.list(path), context.snapshot);
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: filesKeys.list(path) });
    },
  });
}

/**
 * Löschen – einzeln oder als Sammelaktion.
 *
 * Die Einträge verschwinden sofort. Schlägt auch nur einer fehl, wird der
 * gesamte Schnappschuss zurückgerollt und anschließend neu geladen; welche
 * Löschungen tatsächlich durchgingen, sagt uns dann der Server.
 */
export function useDeleteEntries(path) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (entries) => {
      const results = await Promise.allSettled(
        entries.map((entry) => deleteEntry(joinPath(path, entry.name)))
      );

      const failed = results
        .map((result, index) => ({ result, entry: entries[index] }))
        .filter(({ result }) => result.status === 'rejected');

      if (failed.length > 0) {
        const [{ result, entry }] = failed;
        const suffix = failed.length > 1 ? ` (und ${failed.length - 1} weitere)` : '';
        throw new Error(`„${entry.name}" ließ sich nicht löschen: ${result.reason.message}${suffix}`);
      }

      return entries.length;
    },

    onMutate: async (entries) => {
      await queryClient.cancelQueries({ queryKey: filesKeys.list(path) });
      const snapshot = queryClient.getQueryData(filesKeys.list(path));
      const removed = new Set(entries.map((entry) => entry.name));

      queryClient.setQueryData(filesKeys.list(path), (current) =>
        current
          ? { ...current, entries: current.entries.filter((item) => !removed.has(item.name)) }
          : current
      );

      return { snapshot };
    },

    onError: (_error, _variables, context) => {
      if (context?.snapshot) queryClient.setQueryData(filesKeys.list(path), context.snapshot);
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: filesKeys.list(path) });
      queryClient.invalidateQueries({ queryKey: filesKeys.usage() });
    },
  });
}

/**
 * Verschieben in einen anderen Ordner.
 *
 * Optimistisch aus der aktuellen Liste entfernen; der Zielordner wird
 * anschließend ebenfalls invalidiert, damit er beim Hinnavigieren stimmt.
 */
export function useMoveEntries(path) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ entries, targetPath }) => {
      const results = await Promise.allSettled(
        entries.map((entry) => moveEntry({ path: joinPath(path, entry.name), targetPath }))
      );

      const failed = results
        .map((result, index) => ({ result, entry: entries[index] }))
        .filter(({ result }) => result.status === 'rejected');

      if (failed.length > 0) {
        const [{ result, entry }] = failed;
        const suffix = failed.length > 1 ? ` (und ${failed.length - 1} weitere)` : '';
        throw new Error(
          `„${entry.name}" ließ sich nicht verschieben: ${result.reason.message}${suffix}`
        );
      }

      return { count: entries.length, targetPath };
    },

    onMutate: async ({ entries }) => {
      await queryClient.cancelQueries({ queryKey: filesKeys.list(path) });
      const snapshot = queryClient.getQueryData(filesKeys.list(path));
      const moved = new Set(entries.map((entry) => entry.name));

      queryClient.setQueryData(filesKeys.list(path), (current) =>
        current
          ? { ...current, entries: current.entries.filter((item) => !moved.has(item.name)) }
          : current
      );

      return { snapshot };
    },

    onError: (_error, _variables, context) => {
      if (context?.snapshot) queryClient.setQueryData(filesKeys.list(path), context.snapshot);
    },

    onSettled: (_data, _error, variables) => {
      queryClient.invalidateQueries({ queryKey: filesKeys.list(path) });
      queryClient.invalidateQueries({ queryKey: filesKeys.list(variables.targetPath) });
    },
  });
}

/**
 * Nach einem Upload: den betroffenen Ordner und die Speicheranzeige auffrischen.
 * Liegt der Zielordner nicht im Blick, schadet die Invalidierung nichts –
 * Query lädt nur, was gerade jemand beobachtet.
 */
export function useInvalidateAfterUpload() {
  const queryClient = useQueryClient();

  return (targetPath) => {
    queryClient.invalidateQueries({ queryKey: filesKeys.list(targetPath) });
    queryClient.invalidateQueries({ queryKey: filesKeys.usage() });
  };
}
