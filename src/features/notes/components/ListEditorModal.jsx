import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActionIcon,
  Button,
  Checkbox,
  Divider,
  Group,
  Modal,
  Stack,
  Text,
  TextInput,
} from '@mantine/core';
import { IconPlus, IconTrash, IconX } from '@tabler/icons-react';

import {
  addItems,
  clearDone,
  parseList,
  removeItem,
  renameItem,
  serializeList,
  splitItems,
  toggleItem,
} from '../lib/noteList.js';
import { updateNote, useNote } from '../useNotes.js';
import classes from '../Notes.module.scss';

/**
 * Editor für Checklisten.
 *
 * Bewusst karg: Titel, Eingabefeld, Einträge. Mehr steht hier nicht, weil eine
 * Liste im Vorbeigehen bedient wird – jede zusätzliche Anzeige (Fortschritt,
 * Zähler, Zeitstempel) verdrängt genau das, worum es geht. Favorit und Löschen
 * sitzen im Menü der Kachel und werden hier nicht wiederholt.
 *
 * Es gibt **kein Abbrechen**: jede Änderung wird sofort geschrieben. Eine Liste
 * hakt man beiläufig ab – wer den Dialog über die Zurück-Taste verlässt, darf
 * nicht fünf gesetzte Haken verlieren. Local-first über Dexie macht das billig.
 *
 * Der Titel ist die Ausnahme: lokal gehalten, geschrieben beim Verlassen des
 * Feldes. Ein Sync-Eintrag pro Tastendruck wäre sinnlose Last.
 *
 * Gelesen wird über `useNote`, also direkt aus Dexie – dadurch zeigt der Dialog
 * auch Änderungen, die über den Sync von einem anderen Gerät hereinkommen.
 */
export default function ListEditorModal({ opened, noteId, onClose }) {
  const { note } = useNote(opened ? noteId : null);

  const [draft, setDraft] = useState('');
  const [title, setTitle] = useState('');
  const addInput = useRef(null);

  const items = useMemo(() => parseList(note?.body), [note?.body]);
  const { open, done } = useMemo(() => splitItems(items), [items]);

  useEffect(() => {
    if (!opened) return;
    setTitle(note?.title ?? '');
    setDraft('');
  }, [opened, noteId]); // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * Jede Listenänderung geht denselben Weg: neue Einträge, sofort gespeichert.
   *
   * Der Dialog rendert, bevor `useLiveQuery` die Notiz geliefert hat. Ohne die
   * Prüfung auf `note` liefe ein sehr früher Tastendruck in ein `updateNote`
   * für eine noch nicht gelesene Notiz und würfe.
   */
  const apply = (next) =>
    note ? updateNote(noteId, { body: serializeList(next) }) : Promise.resolve();

  async function commitTitle() {
    const trimmed = title.trim();
    if (!note || trimmed === note.title) return;
    await updateNote(noteId, { title: trimmed });
  }

  async function handleAdd() {
    const text = draft.trim();
    if (!text || !note) return;
    setDraft('');
    await apply(addItems(items, text));
    // Fokus bleibt im Feld: eine Liste tippt man am Stück, nicht Eintrag für
    // Eintrag mit zwischenzeitlichem Klicken.
    addInput.current?.focus();
  }

  /**
   * Mehrzeilig eingefügter Text wird zu mehreren Einträgen. Ein `<input>`
   * verschluckt Zeilenumbrüche sonst stillschweigend und aus einer kopierten
   * Einkaufsliste würde eine einzige lange Zeile.
   */
  async function handlePaste(event) {
    const text = event.clipboardData?.getData('text/plain') ?? '';
    if (!text.includes('\n') || !note) return;
    event.preventDefault();
    setDraft('');
    await apply(addItems(items, text));
    addInput.current?.focus();
  }

  async function handleClose() {
    await commitTitle();
    onClose();
  }

  const rowProps = (item) => ({
    item,
    onToggle: () => apply(toggleItem(items, item.id)),
    onRename: (text) => apply(renameItem(items, item.id, text)),
    onRemove: () => apply(removeItem(items, item.id)),
  });

  return (
    <Modal opened={opened} onClose={handleClose} title="Liste" size="md" radius="md" centered>
      <Stack gap="sm">
        {/* Ohne Beschriftung: das Feld steht ganz oben und sieht aus wie die
            Überschrift, die es auch ist. */}
        <TextInput
          variant="unstyled"
          size="md"
          placeholder="Titel"
          value={title}
          onChange={(event) => setTitle(event.currentTarget.value)}
          onBlur={commitTitle}
          className={classes.listTitle}
        />

        <TextInput
          ref={addInput}
          placeholder="Eintrag hinzufügen …"
          value={draft}
          data-autofocus
          onChange={(event) => setDraft(event.currentTarget.value)}
          onPaste={handlePaste}
          onKeyDown={(event) => {
            if (event.key !== 'Enter') return;
            event.preventDefault();
            void handleAdd();
          }}
          // Der Knopf erscheint erst, wenn etwas dasteht – im Ruhezustand ist
          // das Feld nur ein Feld.
          rightSection={
            draft.trim().length > 0 && (
              <ActionIcon variant="subtle" aria-label="Eintrag hinzufügen" onClick={handleAdd}>
                <IconPlus size={16} />
              </ActionIcon>
            )
          }
        />

        {items.length === 0 ? (
          <Text size="sm" c="dimmed" ta="center" py="md">
            Noch nichts drauf.
          </Text>
        ) : (
          <Stack gap={2}>
            {open.map((item) => (
              <ListRow key={item.id} {...rowProps(item)} />
            ))}

            {done.length > 0 && (
              <>
                <Divider my={6} labelPosition="left" label={`Erledigt (${done.length})`} />

                {done.map((item) => (
                  <ListRow key={item.id} {...rowProps(item)} />
                ))}
              </>
            )}
          </Stack>
        )}

        {/* Aufräumen links, Schließen rechts – beide Aktionen betreffen die
            Liste als Ganzes und stehen deshalb zusammen unten, nicht mitten
            zwischen den Einträgen. Der Platz bleibt auch ohne erledigte
            Punkte belegt, damit „Fertig" nicht springt. */}
        <Group justify="space-between">
          {done.length > 0 ? (
            <Button
              // Rot hinterlegt statt nur roter Schrift: der Knopf löscht
              // sofort und ohne Rückfrage, das soll er auch aussehen. „light"
              // statt „filled", damit er neben „Fertig" nicht zur
              // Hauptaktion des Dialogs wird.
              variant="light"
              color="red"
              leftSection={<IconTrash size={16} />}
              onClick={() => apply(clearDone(items))}
            >
              Erledigte löschen
            </Button>
          ) : (
            <span />
          )}

          {/* Kein „Speichern": es ist bereits alles gespeichert. */}
          <Button variant="default" onClick={handleClose}>
            Fertig
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

/**
 * Eine Zeile der Liste.
 *
 * Der Text hängt in einem unauffälligen Eingabefeld – so lässt sich ein Eintrag
 * direkt korrigieren, ohne erst einen Bearbeiten-Modus zu suchen. Geschrieben
 * wird beim Verlassen des Feldes, nicht bei jedem Zeichen.
 */
function ListRow({ item, onToggle, onRename, onRemove }) {
  const [text, setText] = useState(item.text);

  // Kommt der Eintrag über den Sync verändert herein, gewinnt die Fassung aus
  // der Datenbank – solange hier gerade nicht getippt wird.
  useEffect(() => setText(item.text), [item.text]);

  function commit() {
    if (text.trim() === item.text) return;
    onRename(text);
  }

  return (
    <Group gap="xs" wrap="nowrap" className={classes.listRow} data-done={item.done || undefined}>
      <Checkbox
        checked={item.done}
        onChange={onToggle}
        aria-label={item.done ? `${item.text} wieder öffnen` : `${item.text} abhaken`}
      />

      <TextInput
        variant="unstyled"
        flex={1}
        value={text}
        className={classes.listRowInput}
        onChange={(event) => setText(event.currentTarget.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            event.currentTarget.blur();
          }
          if (event.key === 'Escape') setText(item.text);
        }}
        aria-label="Eintrag bearbeiten"
      />

      <ActionIcon
        variant="subtle"
        color="gray"
        size="sm"
        onClick={onRemove}
        aria-label="Eintrag entfernen"
      >
        <IconX size={14} />
      </ActionIcon>
    </Group>
  );
}
