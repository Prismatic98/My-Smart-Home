import { Dropzone } from '@mantine/dropzone';
import { Group, Stack, Text, ThemeIcon } from '@mantine/core';
import { IconUpload } from '@tabler/icons-react';

import classes from '../Files.module.scss';

/**
 * Drag & Drop für den gesamten Sichtbereich.
 *
 * Dropzone.FullScreen legt sich erst über die Seite, wenn wirklich Dateien
 * über das Fenster gezogen werden – ein kleines Ablagefeld irgendwo im Layout
 * wäre auf dem Weg vom Explorer zum Browser deutlich schwerer zu treffen.
 *
 * Auf dem Handy gibt es kein Drag & Drop; dort führt der „Hochladen"-Knopf in
 * der Werkzeugleiste zum Ziel.
 */
export default function UploadDropzone({ onDrop, targetLabel }) {
  return (
    <Dropzone.FullScreen active onDrop={onDrop} className={classes.dropzone}>
      <Group justify="center" mih={220} style={{ pointerEvents: 'none' }}>
        <Stack align="center" gap="xs">
          <ThemeIcon size={64} radius="xl" variant="light" color="teal">
            <IconUpload size={32} />
          </ThemeIcon>
          <Text size="xl" fw={600}>
            Loslassen zum Hochladen
          </Text>
          <Text size="sm" c="dimmed">
            Ziel: {targetLabel}
          </Text>
        </Stack>
      </Group>
    </Dropzone.FullScreen>
  );
}
