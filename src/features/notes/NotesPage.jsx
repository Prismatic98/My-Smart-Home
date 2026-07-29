import { useState } from 'react';
import { Alert, Container, Group, Skeleton, SimpleGrid, Text } from '@mantine/core';
import { IconAlertTriangle, IconFileText } from '@tabler/icons-react';

import ActionFab from '../../components/ActionFab/ActionFab.jsx';
import DeleteNoteModal from './components/DeleteNoteModal.jsx';
import NoteCard from './components/NoteCard.jsx';
import NoteEditorModal from './components/NoteEditorModal.jsx';
import NotesEmptyState from './components/NotesEmptyState.jsx';
import SyncStatus from './components/SyncStatus.jsx';
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
  const [deletion, setDeletion] = useState({ open: false, note: null });
  const [error, setError] = useState(null);

  const openCreate = () => setEditor({ open: true, note: null, noteId: newNoteId() });
  const openEdit = (note) => setEditor({ open: true, note, noteId: note.id });

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
        <NotesEmptyState onCreate={openCreate} />
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

      <DeleteNoteModal
        opened={deletion.open}
        note={deletion.note}
        onClose={closeDelete}
        onConfirm={handleDelete}
      />

      <ActionFab
        actions={[
          {
            key: 'new-note',
            label: 'Neue Notiz',
            icon: IconFileText,
            color: 'yellow',
            onClick: openCreate,
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
