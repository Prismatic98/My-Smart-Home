import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { notifications } from '@mantine/notifications';

import { takeSharedFiles } from './shareTarget.js';

/**
 * Übergabe aus dem Teilen-Menü einsammeln.
 *
 * Der Service Worker hat die Dateien schon abgelegt und den Marker `?share=`
 * in die URL geschrieben, als die Seite geladen wurde. Hier wird der Marker
 * ausgewertet, der Briefkasten geleert und der Marker wieder entfernt.
 *
 * Das Abholen ist auf Modulebene gemerkt und läuft deshalb pro Seitenladen
 * genau einmal. Nötig, weil das Leeren des Briefkastens nicht wiederholbar ist:
 * ein zweiter Durchlauf (React StrictMode, erneutes Einhängen der Seite) käme
 * sonst zu spät und würde die Dateien mit einer leeren Liste überschreiben.
 * Ein neuer Share ist immer eine echte Navigation – damit ist der Merker weg.
 */
let inFlight = null;

function takeOnce() {
  inFlight ??= takeSharedFiles();
  return inFlight;
}

export function useSharedFiles() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [files, setFiles] = useState([]);

  const status = searchParams.get('share');

  useEffect(() => {
    if (!status) return;

    // Marker sofort aus der URL nehmen, damit Neuladen und Zurück-Knopf den
    // Dialog nicht wieder aufpoppen lassen. `path` muss dabei stehen bleiben.
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current);
        next.delete('share');
        return next;
      },
      { replace: true }
    );

    if (status === 'empty') {
      notifications.show({
        color: 'yellow',
        title: 'Nichts zum Hochladen',
        message: 'Die andere App hat keine Datei mitgeschickt.',
      });
      return;
    }

    if (status === 'failed') {
      notifications.show({
        color: 'red',
        title: 'Teilen fehlgeschlagen',
        message: 'Die geteilten Daten ließen sich nicht lesen. Bitte noch einmal versuchen.',
      });
      return;
    }

    // Absichtlich ohne Abbruch-Wächter: das Entfernen des Markers oben ändert
    // die URL und lässt React diesen Effekt sofort aufräumen. Ein
    // `cancelled`-Flag würde also genau die Dateien verwerfen, auf die hier
    // gewartet wird. Doppelt abgeholt wird trotzdem nichts – dafür sorgt der
    // Merker auf Modulebene.
    takeOnce().then((shared) => {
      if (shared.length > 0) setFiles(shared);
    });
  }, [status, setSearchParams]);

  const clear = useCallback(() => setFiles([]), []);

  return { files, clear };
}
