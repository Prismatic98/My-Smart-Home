import { useEffect, useState } from 'react';
import { Center, Code, Loader, ScrollArea, Text } from '@mantine/core';
import { IconAlertTriangle } from '@tabler/icons-react';

import PreviewMessage from './PreviewMessage.jsx';
import classes from '../../Files.module.scss';

/**
 * Textvorschau für .txt, .md, .csv, .json, Logs und Quellcode.
 *
 * Bewusst als reiner Text und nicht als gerendertes Markdown oder mit
 * Syntaxfärbung: eine Vorschau soll zeigen, was in der Datei steht. Beides
 * wären weitere Abhängigkeiten, und bei Markdown würde das Rendern gerade die
 * Zeichen verschlucken, wegen derer man nachschaut.
 *
 * Die Obergrenze für die Größe steckt in previewKind.js – ein 200-MB-Logfile
 * würde den Browser sonst zum Stehen bringen.
 */
export default function TextPreview({ url }) {
  const [state, setState] = useState({ status: 'loading' });

  useEffect(() => {
    const controller = new AbortController();
    setState({ status: 'loading' });

    fetch(url, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error(`Status ${response.status}`);
        return response.text();
      })
      .then((text) => setState({ status: 'ready', text }))
      .catch((error) => {
        if (controller.signal.aborted) return;
        setState({ status: 'error', message: error.message });
      });

    return () => controller.abort();
  }, [url]);

  if (state.status === 'loading') {
    return (
      <Center h="100%">
        <Loader size="sm" />
      </Center>
    );
  }

  if (state.status === 'error') {
    return (
      <PreviewMessage icon={IconAlertTriangle} color="red" title="Die Datei ließ sich nicht laden">
        <Text size="sm" c="dimmed" ta="center">
          {state.message}
        </Text>
      </PreviewMessage>
    );
  }

  return (
    <ScrollArea h="100%" type="auto" className={classes.previewText}>
      <Code block>{state.text || '(leere Datei)'}</Code>
    </ScrollArea>
  );
}
