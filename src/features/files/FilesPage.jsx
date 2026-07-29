import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Alert, Button, Container, Group, Skeleton, Stack } from '@mantine/core';
import { useLocalStorage, useMediaQuery } from '@mantine/hooks';
import { IconAlertTriangle, IconRefresh } from '@tabler/icons-react';

import PageHeader from '../../components/PageHeader/PageHeader.jsx';
import { joinPath, triggerDownload } from './api.js';
import DeleteConfirmModal from './components/DeleteConfirmModal.jsx';
import EmptyState from './components/EmptyState.jsx';
import FileGrid from './components/FileGrid.jsx';
import FileTable from './components/FileTable.jsx';
import FilesToolbar from './components/FilesToolbar.jsx';
import NewFolderModal from './components/NewFolderModal.jsx';
import RenameModal from './components/RenameModal.jsx';
import SelectionBar from './components/SelectionBar.jsx';
import StorageFooter from './components/StorageFooter.jsx';
import UploadDropzone from './components/UploadDropzone.jsx';
import UploadPanel from './components/UploadPanel.jsx';
import {
  useCreateFolder,
  useDeleteEntries,
  useDirectory,
  useInvalidateAfterUpload,
  useRenameEntry,
  useStorageUsage,
} from './useFiles.js';
import { useUploadQueue } from './useUploadQueue.js';
import classes from './Files.module.scss';

/**
 * Dateiablage.
 *
 * Der aktuelle Ordner steht im URL-Parameter `?path=` und nicht im State.
 * Damit funktionieren Zurück-Knopf, Neuladen und Lesezeichen so, wie man es
 * von einem Dateibrowser erwartet.
 *
 * Alle Daten kommen von TanStack Query direkt vom Pi – hier gibt es bewusst
 * keinen Offline-Layer wie bei den Notizen. Was der Browser zeigt, ist der
 * echte Zustand des Dateisystems.
 */
export default function FilesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const path = normalizePath(searchParams.get('path'));

  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(() => new Set());
  const [sort, setSort] = useState({ column: 'name', direction: 'asc' });
  const [view, setView] = useLocalStorage({ key: 'files:view', defaultValue: 'grid' });

  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [renameTarget, setRenameTarget] = useState(null);
  const [deleteTargets, setDeleteTargets] = useState([]);

  // Auf Touch-Geräten gibt es keinen Doppelklick – dort öffnet der einfache Tipp.
  const isTouch = useMediaQuery('(pointer: coarse)');

  const directory = useDirectory(path);
  const usage = useStorageUsage();

  const createFolder = useCreateFolder(path);
  const renameEntry = useRenameEntry(path);
  const deleteEntries = useDeleteEntries(path);

  const invalidateAfterUpload = useInvalidateAfterUpload();
  const uploads = useUploadQueue({
    onFileUploaded: (result) => invalidateAfterUpload(result.targetPath),
  });

  const navigate = useCallback(
    (next) => {
      setSearchParams(next === '/' ? {} : { path: next });
    },
    [setSearchParams]
  );

  // Ordnerwechsel hebt die Auswahl auf – sie bezieht sich immer auf genau
  // einen Ordner, sonst würde man versehentlich anderswo löschen.
  useEffect(() => {
    setSelected(new Set());
    setSearch('');
  }, [path]);

  const entries = useMemo(
    () => sortEntries(filterEntries(directory.data?.entries ?? [], search), sort),
    [directory.data, search, sort]
  );

  const selectedEntries = useMemo(
    () => entries.filter((entry) => selected.has(entry.name)),
    [entries, selected]
  );

  const toggle = useCallback((name) => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }, []);

  const toggleAll = useCallback(
    (checked) => setSelected(checked ? new Set(entries.map((entry) => entry.name)) : new Set()),
    [entries]
  );

  const open = useCallback(
    (entry) => {
      if (entry.type === 'dir') navigate(joinPath(path, entry.name));
      else triggerDownload(joinPath(path, entry.name), entry.name);
    },
    [navigate, path]
  );

  const download = useCallback(
    (entry) => triggerDownload(joinPath(path, entry.name), entry.name),
    [path]
  );

  const startUpload = useCallback(
    (files) => {
      if (files?.length) uploads.enqueue(files, path);
    },
    [uploads, path]
  );

  // Ein einziges verstecktes Datei-Feld für die ganze Seite: der Knopf in der
  // Werkzeugleiste und der Leerzustand lösen dasselbe aus.
  const filePicker = useRef(null);
  const openFilePicker = useCallback(() => filePicker.current?.click(), []);

  // Entf löscht die Auswahl – aber nicht, während in einem Feld getippt wird.
  useEffect(() => {
    const handler = (event) => {
      if (event.key !== 'Delete' || selected.size === 0) return;
      if (event.target.closest('input, textarea, [contenteditable]')) return;
      event.preventDefault();
      setDeleteTargets(selectedEntries);
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [selected, selectedEntries]);

  const closeDelete = () => {
    setDeleteTargets([]);
    deleteEntries.reset();
  };

  const confirmDelete = async () => {
    try {
      await deleteEntries.mutateAsync(deleteTargets);
      setSelected(new Set());
      closeDelete();
    } catch {
      // Der Fehler steht in deleteEntries.error und wird im Modal angezeigt.
    }
  };

  const listProps = {
    entries,
    selected,
    onToggle: toggle,
    onOpen: open,
    onDownload: download,
    onRename: setRenameTarget,
    onDelete: (entry) => setDeleteTargets([entry]),
    singleClickOpens: Boolean(isTouch),
  };

  return (
    <Container size="xl" px={0} className={classes.page}>
      <PageHeader
        title="Datenablage"
        badge="auf dem Pi"
        description="Dateien hochladen, ordnen und wieder herunterladen – gespeichert auf der SSD des Raspberry Pi."
      />

      <FilesToolbar
        path={path}
        onNavigate={navigate}
        search={search}
        onSearchChange={setSearch}
        view={view}
        onViewChange={setView}
        sort={sort}
        onSortChange={setSort}
        onNewFolder={() => setNewFolderOpen(true)}
        onUploadClick={openFilePicker}
        onRefresh={() => directory.refetch()}
        isFetching={directory.isFetching}
      />

      <input
        ref={filePicker}
        type="file"
        multiple
        hidden
        onChange={(event) => {
          startUpload(event.currentTarget.files);
          // Zurücksetzen, sonst löst dieselbe Datei beim zweiten Mal kein
          // change-Ereignis aus.
          event.currentTarget.value = '';
        }}
      />

      <SelectionBar
        count={selected.size}
        onClear={() => setSelected(new Set())}
        onDelete={() => setDeleteTargets(selectedEntries)}
      />

      {directory.isError ? (
        <Alert
          color="red"
          variant="light"
          icon={<IconAlertTriangle size={18} />}
          title="Der Ordner ließ sich nicht laden"
        >
          <Stack gap="sm" align="flex-start">
            <span>{directory.error.message}</span>
            <Button
              size="xs"
              variant="light"
              color="red"
              leftSection={<IconRefresh size={14} />}
              onClick={() => directory.refetch()}
            >
              Erneut versuchen
            </Button>
          </Stack>
        </Alert>
      ) : directory.isPending ? (
        <LoadingSkeleton view={view} />
      ) : entries.length === 0 ? (
        <EmptyState
          variant={search ? 'search' : 'empty'}
          query={search}
          onClearSearch={() => setSearch('')}
          onUpload={openFilePicker}
        />
      ) : view === 'grid' ? (
        <FileGrid {...listProps} />
      ) : (
        <FileTable {...listProps} sort={sort} onSortChange={setSort} onToggleAll={toggleAll} />
      )}

      <StorageFooter usage={usage.data} isLoading={usage.isPending} />

      <UploadDropzone onDrop={startUpload} targetLabel={path === '/' ? 'Ablage' : path} />

      <UploadPanel
        items={uploads.items}
        activeCount={uploads.activeCount}
        overallPercent={uploads.overallPercent}
        onCancel={uploads.cancel}
        onRemove={uploads.remove}
        onClose={uploads.clearFinished}
      />

      <NewFolderModal
        opened={newFolderOpen}
        pending={createFolder.isPending}
        error={createFolder.error}
        onClose={() => {
          setNewFolderOpen(false);
          createFolder.reset();
        }}
        onSubmit={async (name) => {
          try {
            await createFolder.mutateAsync(name);
            setNewFolderOpen(false);
            createFolder.reset();
          } catch {
            // Meldung steht im Modal.
          }
        }}
      />

      <RenameModal
        opened={Boolean(renameTarget)}
        entry={renameTarget}
        pending={renameEntry.isPending}
        error={renameEntry.error}
        onClose={() => {
          setRenameTarget(null);
          renameEntry.reset();
        }}
        onSubmit={async (newName) => {
          try {
            await renameEntry.mutateAsync({ entry: renameTarget, newName });
            setRenameTarget(null);
            renameEntry.reset();
          } catch {
            // Meldung steht im Modal.
          }
        }}
      />

      <DeleteConfirmModal
        opened={deleteTargets.length > 0}
        entries={deleteTargets}
        pending={deleteEntries.isPending}
        error={deleteEntries.error}
        onClose={closeDelete}
        onConfirm={confirmDelete}
      />
    </Container>
  );
}

function LoadingSkeleton({ view }) {
  const count = view === 'grid' ? 8 : 6;
  return (
    <Group gap="sm" wrap="wrap">
      {Array.from({ length: count }, (_, index) => (
        <Skeleton
          key={index}
          height={view === 'grid' ? 140 : 44}
          radius="md"
          style={{ flex: view === 'grid' ? '1 1 180px' : '1 1 100%' }}
        />
      ))}
    </Group>
  );
}

/** Immer ein absoluter Pfad ohne abschließenden Slash. */
function normalizePath(value) {
  if (!value || value === '/') return '/';
  const cleaned = `/${value}`.replace(/\/+/g, '/').replace(/\/$/, '');
  return cleaned === '' ? '/' : cleaned;
}

function filterEntries(entries, search) {
  const needle = search.trim().toLowerCase();
  if (!needle) return entries;
  return entries.filter((entry) => entry.name.toLowerCase().includes(needle));
}

/** Ordner stehen immer vor Dateien – unabhängig von Spalte und Richtung. */
function sortEntries(entries, { column, direction }) {
  const factor = direction === 'asc' ? 1 : -1;

  return [...entries].sort((a, b) => {
    if (a.type !== b.type) return a.type === 'dir' ? -1 : 1;

    if (column === 'size') {
      return ((a.size ?? 0) - (b.size ?? 0)) * factor;
    }
    if (column === 'modifiedAt') {
      return (new Date(a.modifiedAt) - new Date(b.modifiedAt)) * factor;
    }
    return a.name.localeCompare(b.name, 'de', { sensitivity: 'base', numeric: true }) * factor;
  });
}
