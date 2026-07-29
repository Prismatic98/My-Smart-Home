import { Suspense, lazy, useEffect, useState } from 'react';
import { Button, Center, Group, Loader, Modal, Stack, Switch, Text, TextInput } from '@mantine/core';
import { IconStar } from '@tabler/icons-react';

import { formatDateTime } from '../../../lib/formatDate.js';
import { summarizeNoteBody } from '../lib/noteHtml.js';

/**
 * TipTap samt ProseMirror ist das größte Einzelpaket der App. Erst laden, wenn
 * wirklich eine Notiz geöffnet wird – die Übersicht und alle anderen Module
 * bleiben dadurch leicht.
 */
const NoteRichTextEditor = lazy(() => import('./NoteRichTextEditor.jsx'));

/**
 * Editor für neue und bestehende Notizen.
 *
 * Der Formularzustand lebt lokal in dieser Komponente und wird bei jedem
 * Öffnen neu befüllt. Erst beim Speichern geht der Wert über `onSubmit` an die
 * Datenschicht – abbrechen verwirft also alles.
 *
 * Ausnahme sind eingefügte Bilder: die liegen ab dem Einfügen in IndexedDB,
 * weil sie sonst beim Wechsel des Tabs verloren wären. Verworfene Bilder räumt
 * `reconcileNoteImages()` nach dem Schließen weg – deshalb bekommt eine neue
 * Notiz ihre ID schon hier und nicht erst beim Speichern.
 */
export default function NoteEditorModal({ opened, note, noteId, onClose, onSubmit }) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [pinned, setPinned] = useState(false);
  const [saving, setSaving] = useState(false);

  const isEdit = Boolean(note);

  useEffect(() => {
    if (!opened) return;
    setTitle(note?.title ?? '');
    setBody(note?.body ?? '');
    setPinned(Boolean(note?.pinned));
    setSaving(false);
  }, [opened, note]);

  // Ein leeres Dokument ist bei TipTap "<p></p>" – auf Zeichen prüfen genügt
  // hier also nicht, sonst wäre jede frische Notiz scheinbar gefüllt.
  const summary = summarizeNoteBody(body);
  const isEmpty = title.trim().length === 0 && summary.text.length === 0 && summary.imageCount === 0;

  async function handleSubmit(event) {
    event?.preventDefault();
    if (isEmpty || saving) return;

    setSaving(true);
    try {
      await onSubmit({ title, body, pinned: pinned ? 1 : 0 });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={isEdit ? 'Notiz bearbeiten' : 'Neue Notiz'}
      size="xl"
      radius="md"
      centered
    >
      <form onSubmit={handleSubmit}>
        <Stack gap="md">
          <Group gap="sm" align="flex-end" wrap="nowrap">
            <TextInput
              label="Titel"
              placeholder="Worum geht es?"
              value={title}
              onChange={(event) => setTitle(event.currentTarget.value)}
              data-autofocus
              style={{ flex: 1 }}
            />
            <Switch
              label="Favorit"
              checked={pinned}
              onChange={(event) => setPinned(event.currentTarget.checked)}
              thumbIcon={pinned ? <IconStar size={10} /> : null}
              mb={6}
            />
          </Group>

          {/* key: bei einer anderen Notiz einen frischen Editor aufsetzen,
              damit kein Inhalt der vorherigen stehen bleibt. */}
          <Suspense fallback={<EditorFallback />}>
            {opened && (
              <NoteRichTextEditor
                key={noteId}
                noteId={noteId}
                initialBody={note?.body ?? ''}
                onChange={setBody}
              />
            )}
          </Suspense>

          {isEdit && (
            <Text size="xs" c="dimmed">
              Erstellt {formatDateTime(note.createdAt)} · zuletzt geändert{' '}
              {formatDateTime(note.updatedAt)}
            </Text>
          )}

          <Group justify="flex-end" gap="sm">
            <Button variant="default" onClick={onClose} disabled={saving}>
              Abbrechen
            </Button>
            <Button type="submit" loading={saving} disabled={isEmpty}>
              Speichern
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}

function EditorFallback() {
  return (
    <Center mih={240}>
      <Stack align="center" gap="xs">
        <Loader size="sm" />
        <Text size="xs" c="dimmed">
          Editor wird geladen…
        </Text>
      </Stack>
    </Center>
  );
}
