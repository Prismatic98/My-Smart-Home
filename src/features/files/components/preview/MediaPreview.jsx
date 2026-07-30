import { useState } from 'react';
import { Center, Text } from '@mantine/core';
import { IconPlayerPlayFilled } from '@tabler/icons-react';

import PreviewMessage from './PreviewMessage.jsx';
import classes from '../../Files.module.scss';

/**
 * Video und Audio.
 *
 * Beide streamen: `preload="metadata"` holt nur den Kopf der Datei, und weil
 * der Server Range-Requests beantwortet, lädt das Springen in der Zeitleiste
 * nur den benötigten Ausschnitt. Deshalb gibt es hier auch keine
 * Größenbremse – ein 2-GB-Video kostet beim Öffnen so gut wie nichts.
 *
 * Was der Browser abspielen kann, entscheidet er selbst: MP4/H.264 und WebM
 * überall, MKV und exotische Codecs praktisch nie. Genau dafür der
 * Fehlerzweig – ein stummes schwarzes Rechteck wäre die schlechteste Antwort.
 */
export default function MediaPreview({ url, kind, name }) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <PreviewMessage
        icon={IconPlayerPlayFilled}
        title={
          kind === 'video'
            ? 'Dieses Video kann der Browser nicht abspielen'
            : 'Diese Audiodatei kann der Browser nicht abspielen'
        }
      >
        <Text size="sm" c="dimmed" ta="center">
          Meist liegt es am Codec (etwa MKV oder H.265). Heruntergeladen spielt sie in
          einem lokalen Player.
        </Text>
      </PreviewMessage>
    );
  }

  if (kind === 'audio') {
    return (
      <Center className={classes.previewStage} p="xl">
        <audio
          src={url}
          controls
          preload="metadata"
          className={classes.previewAudio}
          aria-label={name}
          onError={() => setFailed(true)}
        >
          <track kind="captions" />
        </audio>
      </Center>
    );
  }

  return (
    <Center className={classes.previewStage}>
      <video
        src={url}
        controls
        preload="metadata"
        playsInline
        className={classes.previewVideo}
        aria-label={name}
        onError={() => setFailed(true)}
      >
        <track kind="captions" />
      </video>
    </Center>
  );
}
