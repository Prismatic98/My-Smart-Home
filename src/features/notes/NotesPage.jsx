import { useState } from 'react';
import { Alert, Button, Container, Group, Skeleton, SimpleGrid } from '@mantine/core';
import { IconAlertTriangle, IconPlus } from '@tabler/icons-react';

import PageHeader from '../../components/PageHeader/PageHeader.jsx';
import DeleteNoteModal from './components/DeleteNoteModal.jsx';
import NoteCard from './components/NoteCard.jsx';
import NoteEditorModal from './components/NoteEditorModal.jsx';
import NotesEmptyState from './components/NotesEmptyState.jsx';
import { createNote, deleteNote, updateNote, useNotes } from './useNotes.js';

export default function NotesPage() {
  const { notes, isLoading } = useNotes();

  // `note: null` = neue Notiz. Beim Schließen bleibt `note` stehen, damit das
  // Modal sauber ausblenden kann, ohne dass der Inhalt vorher wegspringt.
  const [editor, setEditor] = useState({ open: false, note: null });
  const [deletion, setDeletion] = useState({ open: false, note: null });
  const [error, setError] = useState(null);

  const openCreate = () => setEditor({ open: true, note: null });
  const openEdit = (note) => setEditor({ open: true, note });
  const closeEditor = () => setEditor((state) => ({ ...state, open: false }));

  const openDelete = (note) => setDeletion({ open: true, note });
  const closeDelete = () => setDeletion((state) => ({ ...state, open: false }));

  async function handleSubmit({ title, body }) {
    setError(null);
    try {
      if (editor.note) {
        await updateNote(editor.note.id, { title, body });
      } else {
        await createNote({ title, body });
      }
      closeEditor();
    } catch (cause) {
      setError(`Die Notiz konnte nicht gespeichert werden: ${cause.message}`);
    }
  }

  async function handleDelete() {
    setError(null);
    try {
      await deleteNote(deletion.note.id);
      closeDelete();
    } catch (cause) {
      setError(`Die Notiz konnte nicht gelöscht werden: ${cause.message}`);
    }
  }

  return (
    <Container size="lg" px={0}>
      <Group justify="space-between" align="flex-start" wrap="wrap" gap="sm">
        <PageHeader
          title="Notizen"
          badge="lokal"
          description="Gespeichert im Browser (IndexedDB) – offline verfügbar. Die Synchronisation mit dem Backend folgt später."
        />
        <Button leftSection={<IconPlus size={16} />} onClick={openCreate}>
          Neue Notiz
        </Button>
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
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
          {notes.map((note) => (
            <NoteCard key={note.id} note={note} onEdit={openEdit} onDelete={openDelete} />
          ))}
        </SimpleGrid>
      )}

      <NoteEditorModal
        opened={editor.open}
        note={editor.note}
        onClose={closeEditor}
        onSubmit={handleSubmit}
      />

      <DeleteNoteModal
        opened={deletion.open}
        note={deletion.note}
        onClose={closeDelete}
        onConfirm={handleDelete}
      />
    </Container>
  );
}
