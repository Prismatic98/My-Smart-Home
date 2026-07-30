import { useState } from 'react';
import { Center, Loader, Text } from '@mantine/core';
import { IconPhotoOff } from '@tabler/icons-react';

import PreviewMessage from './PreviewMessage.jsx';
import classes from '../../Files.module.scss';

/**
 * Bildvorschau: das Original, kein Thumbnail.
 *
 * Serverseitig verkleinerte Vorschaubilder wären für eine Liste Pflicht, für
 * eine einzelne Ansicht auf Abruf aber unnötig – und sie brauchten einen
 * Bildkonverter auf dem Pi. Die Größenbremse in previewKind.js fängt die Fälle
 * ab, in denen das über eine langsame Leitung wehtun würde.
 */
export default function ImagePreview({ url, name }) {
  const [status, setStatus] = useState('loading');

  if (status === 'error') {
    return (
      <PreviewMessage icon={IconPhotoOff} title="Dieses Bild kann der Browser nicht anzeigen">
        <Text size="sm" c="dimmed" ta="center">
          Bei Formaten wie HEIC aus einer iPhone-Kamera ist das normal. Herunterladen
          funktioniert trotzdem.
        </Text>
      </PreviewMessage>
    );
  }

  return (
    <Center className={classes.previewStage}>
      {status === 'loading' && (
        <Loader size="sm" className={classes.previewSpinner} />
      )}
      <img
        src={url}
        alt={name}
        className={classes.previewImage}
        // Erst nach dem Laden einblenden, sonst blitzt ein halbes Bild auf.
        data-ready={status === 'ready' || undefined}
        onLoad={() => setStatus('ready')}
        onError={() => setStatus('error')}
      />
    </Center>
  );
}
