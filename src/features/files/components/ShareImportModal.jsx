import { useEffect, useState } from 'react';
import {
  Button,
  Group,
  Image,
  Modal,
  ScrollArea,
  Stack,
  Text,
  ThemeIcon,
  Title,
} from '@mantine/core';
import { useLocalStorage } from '@mantine/hooks';
import { IconUpload } from '@tabler/icons-react';

import { fileIcon } from '../lib/fileIcon.js';
import { formatBytes } from '../lib/formatBytes.js';
import FolderPicker from './FolderPicker.jsx';
import classes from '../Files.module.scss';

/**
 * Dateien aus dem Teilen-Menü einsortieren.
 *
 * Der Weg über das Systemmenü lässt keinen Zielordner mitgeben – die Wahl muss
 * also hier passieren, und zwar bevor irgendetwas hochgeladen wird. Das Ziel
 * des letzten Mals wird gemerkt: Scans landen in der Praxis immer im selben
 * Ordner, und der Weg dorthin über den Browser ist auf dem Handy mühsam.
 *
 * Der Dialog lädt selbst nichts hoch. Er gibt den Zielordner nach oben und die
 * bestehende Upload-Warteschlange erledigt den Rest – samt Fortschritt,
 * Abbrechen und Sammelmeldung.
 */
export default function ShareImportModal({ files = [], onClose, onSubmit }) {
  const opened = files.length > 0;

  const [lastTarget, setLastTarget] = useLocalStorage({
    key: 'files:shareTarget',
    defaultValue: '/',
  });

  const [target, setTarget] = useState(lastTarget);
  const previews = usePreviews(files);

  // Beim Öffnen beim gemerkten Ziel starten. Erst das Hochladen schreibt den
  // Merker fort – ein Ordner, durch den man nur geblättert hat, soll nicht
  // beim nächsten Mal als Vorschlag dastehen.
  useEffect(() => {
    if (opened) setTarget(lastTarget);
  }, [opened, lastTarget]);

  const totalSize = files.reduce((sum, file) => sum + file.size, 0);

  const submit = () => {
    setLastTarget(target);
    onSubmit(target);
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={files.length === 1 ? 'Geteilte Datei hochladen' : `${files.length} geteilte Dateien hochladen`}
      radius="md"
      centered
      size="md"
    >
      <Stack gap="sm">
        <ScrollArea.Autosize mah={200} type="auto" className={classes.movePicker}>
          <Stack gap={2}>
            {files.map((file, index) => {
              const { icon: Icon, color } = fileIcon({ name: file.name, mimeType: file.type });

              return (
                <Group key={`${file.name}-${index}`} gap="sm" wrap="nowrap" className={classes.uploadRow}>
                  {previews[index] ? (
                    <Image src={previews[index]} w={36} h={36} radius="sm" fit="cover" alt="" />
                  ) : (
                    <ThemeIcon variant="light" color={color} size={36} radius="sm">
                      <Icon size={20} />
                    </ThemeIcon>
                  )}
                  <Stack gap={0} style={{ flex: 1, minWidth: 0 }}>
                    <Text size="sm" lineClamp={1} title={file.name}>
                      {file.name}
                    </Text>
                    <Text size="xs" c="dimmed">
                      {formatBytes(file.size)}
                    </Text>
                  </Stack>
                </Group>
              );
            })}
          </Stack>
        </ScrollArea.Autosize>

        <Title order={6}>Zielordner</Title>

        <FolderPicker
          value={target}
          onChange={setTarget}
          emptyHint="Keine Unterordner – hierher hochladen ist trotzdem möglich."
        />

        <Group justify="space-between" gap="sm" wrap="nowrap">
          <Text size="xs" c="dimmed">
            {formatBytes(totalSize)} insgesamt
          </Text>
          <Group gap="sm" wrap="nowrap">
            <Button variant="default" onClick={onClose}>
              Verwerfen
            </Button>
            <Button color="teal" leftSection={<IconUpload size={16} />} onClick={submit}>
              Hierher hochladen
            </Button>
          </Group>
        </Group>
      </Stack>
    </Modal>
  );
}

/**
 * Vorschau für Bilder. Beim Scannen mit der Kamera ist das die einzige
 * verlässliche Kontrolle, ob die richtige Aufnahme geteilt wurde – die Namen
 * sind dort reine Zeitstempel.
 */
function usePreviews(files) {
  const [urls, setUrls] = useState([]);

  useEffect(() => {
    const created = files.map((file) =>
      file.type.startsWith('image/') ? URL.createObjectURL(file) : null
    );
    setUrls(created);

    // Ohne revoke bleiben die Blobs bis zum Neuladen im Speicher hängen.
    return () => created.forEach((url) => url && URL.revokeObjectURL(url));
  }, [files]);

  return urls;
}
