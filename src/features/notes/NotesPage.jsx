import { useState } from 'react';
import { Alert, Container, Group, Skeleton, SimpleGrid, Text } from '@mantine/core';
import { IconAlertTriangle, IconFileText, IconListCheck } from '@tabler/icons-react';

import ActionFab from '../../components/ActionFab/ActionFab.jsx';
import DeleteNoteModal from './components/DeleteNoteModal.jsx';
import ListEditorModal from './components/ListEditorModal.jsx';
import NoteCard from './components/NoteCard.jsx';
import NoteEditorModal from './components/NoteEditorModal.jsx';
import NotesEmptyState from './components/NotesEmptyState.jsx';
import SyncStatus from './components/SyncStatus.jsx';
import { emptyListBody, listStats, parseList } from './lib/noteList.js';
import {
  createNote,
  deleteNote,
  getNote,
  newNoteId,
  reconcileNoteImages,
  togglePinned,
  updateNote,
  useNotes,
} from './useNotes.js';
import { useNotesSync } from './useNotesSync.js';

export default function NotesPage() {
  const { notes, isLoading } = useNotes();

  // Derselbe Query-Key wie im NotesSyncWorker (main.jsx) – TanStack Query
  // teilt sich die Instanz. Hier wird also nur der Zustand mitgelesen, es
  // läuft kein zweiter Sync.
  const sync = useNotesSync();

  // `note: null` = neue Notiz. `noteId` steht trotzdem schon fest, damit
  // eingefügte Bilder einer Notiz zugeordnet werden können, bevor sie
  // gespeichert ist. Beim Schließen bleibt der Zustand stehen, damit das
  // Modal sauber ausblenden kann.
  const [editor, setEditor] = useState({ open: false, note: null, noteId: null });
  const [list, setList] = useState({ open: false, noteId: null });
  const [deletion, setDeletion] = useState({ open: false, note: null });
  const [error, setError] = useState(null);

  const openCreate = () => setEditor({ open: true, note: null, noteId: newNoteId() });

  /**
   * Eine Liste entsteht sofort in der Datenbank, nicht erst beim Speichern.
   *
   * Der Listen-Editor schreibt jede Änderung direkt durch (siehe dort) und
   * braucht dafür eine Notiz, an der er hängen kann. Bleibt sie am Ende leer,
   * räumt closeList() sie wieder weg – dasselbe Muster wie bei den Bildern
   * einer verworfenen Notiz.
   */
  async function openCreateList() {
    setError(null);
    try {
      const note = await createNote({ kind: 'list', body: emptyListBody() });
      setList({ open: true, noteId: note.id });
    } catch (cause) {
      setError(`Die Liste konnte nicht angelegt werden: ${cause.message}`);
    }
  }

  const openEdit = (note) =>
    note.kind === 'list'
      ? setList({ open: true, noteId: note.id })
      : setEditor({ open: true, note, noteId: note.id });

  /** Eine Liste ohne Titel und ohne Einträge ist nichts – die bleibt nicht stehen. */
  async function closeList() {
    const { noteId } = list;
    setList((state) => ({ ...state, open: false }));
    if (!noteId) return;

    const stored = await getNote(noteId);
    if (!stored || stored.deletedAt != null) return;
    if (stored.title.trim().length > 0) return;
    if (listStats(parseList(stored.body)).total > 0) return;

    await deleteNote(noteId);
  }

  const openDelete = (note) => setDeletion({ open: true, note });
  const closeDelete = () => setDeletion((state) => ({ ...state, open: false }));

  /**
   * Schließen ohne Speichern: eingefügte Bilder liegen dann schon in
   * IndexedDB, gehören aber zu einem Inhalt, den es nicht gibt. Abgeglichen
   * wird gegen den gespeicherten Stand – bei einer neuen Notiz ist das nichts.
   */
  async function closeEditor() {
    const { noteId, note } = editor;
    setEditor((state) => ({ ...state, open: false }));

    if (!noteId) return;
    const stored = note ? await getNote(noteId) : null;
    await reconcileNoteImages(noteId, stored?.body ?? '');
  }

  async function handleSubmit({ title, body, pinned }) {
    setError(null);
    try {
      if (editor.note) {
        await updateNote(editor.note.id, { title, body, pinned });
      } else {
        await createNote({ id: editor.noteId, title, body, pinned });
      }
      // Bilder, die während des Bearbeitens wieder entfernt wurden, verschwinden
      // hier – lokal und beim nächsten Sync auch auf dem Server.
      await reconcileNoteImages(editor.noteId, body);
      setEditor((state) => ({ ...state, open: false }));
    } catch (cause) {
      setError(`Die Notiz konnte nicht gespeichert werden: ${cause.message}`);
    }
  }

  async function handleDelete() {
    setError(null);
    try {
      const { id } = deletion.note;
      await deleteNote(id);
      // Zur gelöschten Notiz gehören keine Bilder mehr.
      await reconcileNoteImages(id, '');
      closeDelete();
    } catch (cause) {
      setError(`Die Notiz konnte nicht gelöscht werden: ${cause.message}`);
    }
  }

  async function handleTogglePinned(note) {
    setError(null);
    try {
      await togglePinned(note.id);
    } catch (cause) {
      setError(`Der Favorit konnte nicht geändert werden: ${cause.message}`);
    }
  }

  const favourites = notes.filter((note) => note.pinned);
  const others = notes.filter((note) => !note.pinned);

  const cardProps = {
    onEdit: openEdit,
    onTogglePinned: handleTogglePinned,
    onDelete: openDelete,
  };

  // pb: Platz für den Aktionsknopf unten rechts, damit er die letzte
  // Kartenreihe nicht verdeckt.
  return (
    <Container size="lg" px={0} pb={96}>
      <Group justify="flex-end" mb="sm">
        <SyncStatus
          status={sync.status}
          lastSyncedAt={sync.lastSyncedAt}
          error={sync.error}
          onRetry={sync.sync}
        />
      </Group>

      {error && (
        <Alert
          color="red"
          variant="light"
          icon={<IconAlertTriangle size={18} />}
          withCloseButton
          onClose={() => setError(null)}
          mb="md"
        >
          {error}
        </Alert>
      )}

      {isLoading ? (
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
          {[0, 1, 2].map((index) => (
            <Skeleton key={index} height={140} radius="md" />
          ))}
        </SimpleGrid>
      ) : notes.length === 0 ? (
        <NotesEmptyState onCreate={openCreate} onCreateList={openCreateList} />
      ) : (
        <>
          {/* Überschriften nur, wenn es auch etwas zu trennen gibt. */}
          {favourites.length > 0 && (
            <>
              <SectionLabel>Favoriten</SectionLabel>
              <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md" mb="lg">
                {favourites.map((note) => (
                  <NoteCard key={note.id} note={note} {...cardProps} />
                ))}
              </SimpleGrid>
            </>
          )}

          {others.length > 0 && (
            <>
              {favourites.length > 0 && <SectionLabel>Weitere</SectionLabel>}
              <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
                {others.map((note) => (
                  <NoteCard key={note.id} note={note} {...cardProps} />
                ))}
              </SimpleGrid>
            </>
          )}
        </>
      )}

      <NoteEditorModal
        opened={editor.open}
        note={editor.note}
        noteId={editor.noteId}
        onClose={closeEditor}
        onSubmit={handleSubmit}
      />

      {/* Favorit und Löschen sitzen im Menü der Kachel – der Editor selbst
          bleibt auf das beschränkt, was die Liste ausmacht. */}
      <ListEditorModal opened={list.open} noteId={list.noteId} onClose={closeList} />

      <DeleteNoteModal
        opened={deletion.open}
        note={deletion.note}
        onClose={closeDelete}
        onConfirm={handleDelete}
      />

      <ActionFab
        actions={[
          {
            key: 'new-doc',
            label: 'Neues Textdokument',
            icon: IconFileText,
            color: 'yellow',
            onClick: openCreate,
          },
          {
            key: 'new-list',
            label: 'Neue Liste',
            icon: IconListCheck,
            color: 'teal',
            onClick: openCreateList,
          },
        ]}
      />
    </Container>
  );
}

function SectionLabel({ children }) {
  return (
    <Text size="xs" fw={700} c="dimmed" tt="uppercase" mb="xs" style={{ letterSpacing: '0.06em' }}>
      {children}
    </Text>
  );
}
