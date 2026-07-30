import { lazy, Suspense, useState } from 'react';
import { Button, Center, Loader, Text } from '@mantine/core';
import { IconEye } from '@tabler/icons-react';

import { exceedsPreviewLimit, previewKind } from '../../lib/previewKind.js';
import { fileIcon } from '../../lib/fileIcon.js';
import { formatBytes } from '../../lib/formatBytes.js';
import ImagePreview from './ImagePreview.jsx';
import MediaPreview from './MediaPreview.jsx';
import PreviewMessage from './PreviewMessage.jsx';
import TextPreview from './TextPreview.jsx';

/**
 * Wählt den passenden Renderer.
 *
 * pdf.js wiegt rund 1,7 MB und wird darum erst geladen, wenn wirklich eine PDF
 * geöffnet wird – wie der Notiz-Editor (TipTap) darf es nicht im Hauptbundle
 * landen.
 */
const PdfPreview = lazy(() => import('./PdfPreview.jsx'));

export default function PreviewBody({ entry, url }) {
  const kind = previewKind(entry);

  // Große Dateien erst auf Zuruf: über Tailscale von unterwegs ist die
  // Uploadleitung des Pi der Engpass, und niemand hat um 40 MB gebeten.
  const [confirmed, setConfirmed] = useState(false);
  const gated = exceedsPreviewLimit(kind, entry.size) && !confirmed;

  if (kind === 'none') {
    const { icon: Icon } = fileIcon(entry);
    return (
      <PreviewMessage icon={Icon} title="Für diesen Dateityp gibt es keine Vorschau">
        <Text size="sm" c="dimmed" ta="center">
          Office-Dokumente, Archive und Programme kann ein Browser nicht darstellen. Das
          bräuchte einen Konverter auf dem Pi – herunterladen geht natürlich.
        </Text>
      </PreviewMessage>
    );
  }

  if (gated) {
    return (
      <PreviewMessage icon={IconEye} title={`Diese Datei ist ${formatBytes(entry.size)} groß`}>
        <Text size="sm" c="dimmed" ta="center">
          Von unterwegs kann das Laden dauern. Vorschau nur, wenn du sie brauchst.
        </Text>
        <Button variant="light" mt="xs" onClick={() => setConfirmed(true)}>
          Vorschau trotzdem laden
        </Button>
      </PreviewMessage>
    );
  }

  if (kind === 'image') return <ImagePreview url={url} name={entry.name} />;
  if (kind === 'text') return <TextPreview url={url} />;
  if (kind === 'video' || kind === 'audio') {
    return <MediaPreview url={url} kind={kind} name={entry.name} />;
  }

  return (
    <Suspense
      fallback={
        <Center h="100%">
          <Loader size="sm" />
        </Center>
      }
    >
      <PdfPreview url={url} />
    </Suspense>
  );
}
