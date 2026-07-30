import { useEffect } from 'react';
import {
  ActionIcon,
  Button,
  Group,
  Modal,
  SimpleGrid,
  Stack,
  Text,
  ThemeIcon,
  Tooltip,
} from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import {
  IconChevronLeft,
  IconChevronRight,
  IconDownload,
  IconExternalLink,
} from '@tabler/icons-react';

import { formatDateTime, formatRelativeDateTime } from '../../../lib/formatDate.js';
import { joinPath, previewUrl } from '../api.js';
import { fileIcon } from '../lib/fileIcon.js';
import { formatBytes } from '../lib/formatBytes.js';
import FileEntryMenu from './FileEntryMenu.jsx';
import PreviewBody from './preview/PreviewBody.jsx';
import classes from '../Files.module.scss';

/**
 * Vorschau einer Datei mit ihren Metadaten.
 *
 * Auf dem Handy bildschirmfüllend, auf dem Rechner ein großes Fenster – bei
 * einer Vorschau ist die Fläche der eigentliche Inhalt.
 *
 * Die Aktionen aus dem Kontextmenü (umbenennen, verschieben, löschen) schließen
 * die Vorschau, bevor ihr Dialog aufgeht: zwei gestapelte Fenster übereinander
 * sind auf einem Telefon nicht zu bedienen.
 */
export default function FilePreviewModal({
  entry,
  path,
  hasPrev,
  hasNext,
  onNavigate,
  onClose,
  onDownload,
  onRename,
  onMove,
  onDelete,
}) {
  const fullScreen = useMediaQuery('(max-width: 48em)');

  // Blättern per Tastatur. Nicht, während ein Feld oder ein Player den Fokus
  // hat – dort bedeuten die Pfeiltasten schon etwas (Cursor, Spulen).
  useEffect(() => {
    if (!entry) return;

    const handler = (event) => {
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
      if (event.target.closest?.('input, textarea, [contenteditable], video, audio')) return;

      event.preventDefault();
      onNavigate(event.key === 'ArrowLeft' ? -1 : 1);
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [entry, onNavigate]);

  if (!entry) return null;

  const fullPath = joinPath(path, entry.name);
  const url = previewUrl(fullPath);
  const { icon: Icon, color, label } = fileIcon(entry);
  const modified = new Date(entry.modifiedAt).getTime();

  /** Erst schließen, dann die Aktion – sonst liegen zwei Dialoge übereinander. */
  const closeThen = (action) => () => {
    onClose();
    action(entry);
  };

  return (
    <Modal.Root opened onClose={onClose} fullScreen={fullScreen} size="80rem" centered radius="md">
      <Modal.Overlay />
      <Modal.Content
        className={`${classes.previewContent} ${fullScreen ? '' : classes.previewContentWindowed}`}
      >
        <Modal.Header className={classes.previewHeader}>
          <Group gap="sm" wrap="nowrap" className={classes.previewTitle}>
            <ThemeIcon variant="light" color={color} size="lg" radius="md">
              <Icon size={20} />
            </ThemeIcon>
            <div className={classes.previewTitleText}>
              <Text fw={600} lineClamp={1} title={entry.name}>
                {entry.name}
              </Text>
              <Text size="xs" c="dimmed">
                {label} · {formatBytes(entry.size)}
              </Text>
            </div>
          </Group>

          <Group gap={4} wrap="nowrap">
            {(hasPrev || hasNext) && (
              <>
                <ActionIcon
                  variant="subtle"
                  color="gray"
                  aria-label="Vorherige Datei"
                  disabled={!hasPrev}
                  onClick={() => onNavigate(-1)}
                >
                  <IconChevronLeft size={20} />
                </ActionIcon>
                <ActionIcon
                  variant="subtle"
                  color="gray"
                  aria-label="Nächste Datei"
                  disabled={!hasNext}
                  onClick={() => onNavigate(1)}
                >
                  <IconChevronRight size={20} />
                </ActionIcon>
              </>
            )}

            <FileEntryMenu
              entry={entry}
              onDownload={onDownload}
              onRename={closeThen(onRename)}
              onMove={closeThen(onMove)}
              onDelete={closeThen(onDelete)}
            />

            <Modal.CloseButton />
          </Group>
        </Modal.Header>

        <Modal.Body className={classes.previewBody}>
          {/* key: beim Blättern muss der Renderer neu anfangen, sonst bliebe
              der Zustand der vorigen Datei stehen (Ladefehler, Seitenzahl). */}
          <div className={classes.previewFrame}>
            <PreviewBody key={fullPath} entry={entry} url={url} />
          </div>

          <Stack gap="sm" className={classes.previewFooter}>
            <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="xs" verticalSpacing={4}>
              <Detail label="Typ" value={entry.mimeType || label} />
              <Detail label="Größe" value={formatBytes(entry.size)} />
              <Detail
                label="Geändert"
                value={formatRelativeDateTime(modified)}
                title={formatDateTime(modified)}
              />
              <Detail label="Ort" value={path === '/' ? 'Ablage' : path} title={fullPath} />
            </SimpleGrid>

            <Group gap="sm" wrap="wrap">
              <Button
                onClick={() => onDownload(entry)}
                color="teal"
              >
                <IconDownload size={16} />
              </Button>
              <Button
                  variant="default"
                  component="a"
                  href={url}
                  target="_blank"
                  rel="noreferrer"
              >
                <IconExternalLink size={16} />
              </Button>
            </Group>
          </Stack>
        </Modal.Body>
      </Modal.Content>
    </Modal.Root>
  );
}

function Detail({ label, value, title }) {
  return (
    <div>
      <Text size="xs" c="dimmed">
        {label}
      </Text>
      <Text size="sm" lineClamp={1} title={title ?? value}>
        {value}
      </Text>
    </div>
  );
}
