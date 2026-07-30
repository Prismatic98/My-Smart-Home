import { useEffect, useRef, useState } from 'react';
import { ActionIcon, Center, Group, Loader, Text } from '@mantine/core';
import { IconAlertTriangle, IconChevronLeft, IconChevronRight } from '@tabler/icons-react';
import * as pdfjs from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

import PreviewMessage from './PreviewMessage.jsx';
import classes from '../../Files.module.scss';

/**
 * PDF-Vorschau über pdf.js.
 *
 * Warum nicht einfach ein <iframe> auf die Datei: Chrome auf Android hat keinen
 * PDF-Betrachter für eingebettete Rahmen – die Vorschau bliebe dort leer, und
 * das ist genau der Hauptfall (Scans auf dem Handy). pdf.js rendert selbst und
 * verhält sich damit überall gleich. Preis dafür sind ~1,7 MB, die deshalb
 * ausschließlich beim ersten PDF geladen werden (React.lazy in PreviewBody).
 *
 * Gezeigt wird immer nur die aktuelle Seite. Alle Seiten gleichzeitig zu
 * rendern kostet bei einem langen Dokument sehr viel Speicher, ohne dass
 * jemand danach gefragt hätte.
 */

// Eigener Thread fürs Parsen und Rendern, sonst steht die Oberfläche still.
// Vite liefert die Datei über ?url als separates Asset aus.
pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

// Nicht eingebettete Standardschriften (Helvetica, Times …). Siehe das
// pdfjs-standard-fonts-Plugin in vite.config.js.
const STANDARD_FONT_DATA_URL = '/pdfjs/standard_fonts/';

/** Über 2 lohnt sich die Pixeldichte nicht mehr, kostet aber Speicher im Quadrat. */
const MAX_PIXEL_RATIO = 2;

export default function PdfPreview({ url }) {
  const stageRef = useRef(null);
  const canvasRef = useRef(null);

  const [pdf, setPdf] = useState(null);
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState(null);

  // Dokument öffnen.
  useEffect(() => {
    let cancelled = false;
    setPdf(null);
    setPage(1);
    setError(null);
    setBusy(true);

    const task = pdfjs.getDocument({ url, standardFontDataUrl: STANDARD_FONT_DATA_URL });

    task.promise.then(
      (opened) => {
        if (!cancelled) setPdf(opened);
      },
      (cause) => {
        if (!cancelled) {
          setError(describe(cause));
          setBusy(false);
        }
      }
    );

    // destroy() bricht auch einen laufenden Download ab und gibt den Worker
    // frei – ohne das bliebe bei jedem geöffneten PDF einer stehen.
    return () => {
      cancelled = true;
      task.destroy();
    };
  }, [url]);

  // Aktuelle Seite zeichnen.
  useEffect(() => {
    if (!pdf) return;

    let cancelled = false;
    let task;
    setBusy(true);

    (async () => {
      try {
        const pdfPage = await pdf.getPage(page);
        if (cancelled) return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        // An die Breite der Bühne anpassen, dann mit der Pixeldichte des
        // Geräts multiplizieren – sonst wird die Seite auf dem Handy unscharf.
        const available = stageRef.current?.clientWidth ?? 640;
        const unscaled = pdfPage.getViewport({ scale: 1 });
        const ratio = Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO);
        const viewport = pdfPage.getViewport({ scale: (available / unscaled.width) * ratio });

        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);

        task = pdfPage.render({ canvasContext: canvas.getContext('2d'), viewport });
        await task.promise;

        if (!cancelled) setBusy(false);
      } catch (cause) {
        // Ein abgebrochenes Rendern ist kein Fehler, sondern der Normalfall
        // beim Umblättern.
        if (cancelled || cause?.name === 'RenderingCancelledException') return;
        setError(describe(cause));
        setBusy(false);
      }
    })();

    return () => {
      cancelled = true;
      task?.cancel();
    };
  }, [pdf, page]);

  if (error) {
    return (
      <PreviewMessage icon={IconAlertTriangle} color="red" title={error}>
        <Text size="sm" c="dimmed" ta="center">
          Herunterladen und in einem PDF-Programm öffnen funktioniert unabhängig davon.
        </Text>
      </PreviewMessage>
    );
  }

  const pageCount = pdf?.numPages ?? 0;

  return (
    <div className={classes.pdfWrapper}>
      <div ref={stageRef} className={classes.pdfStage}>
        <canvas ref={canvasRef} className={classes.pdfCanvas} />
        {busy && (
          <Center className={classes.pdfBusy}>
            <Loader size="sm" />
          </Center>
        )}
      </div>

      {pageCount > 1 && (
        <Group justify="center" gap="xs" className={classes.pdfPager}>
          <ActionIcon
            variant="default"
            aria-label="Vorherige Seite"
            disabled={page <= 1}
            onClick={() => setPage((current) => Math.max(1, current - 1))}
          >
            <IconChevronLeft size={18} />
          </ActionIcon>
          <Text size="sm" c="dimmed">
            Seite {page} von {pageCount}
          </Text>
          <ActionIcon
            variant="default"
            aria-label="Nächste Seite"
            disabled={page >= pageCount}
            onClick={() => setPage((current) => Math.min(pageCount, current + 1))}
          >
            <IconChevronRight size={18} />
          </ActionIcon>
        </Group>
      )}
    </div>
  );
}

/** Die Ausnahmen von pdf.js sind typisiert – daraus wird ein lesbarer Satz. */
function describe(cause) {
  switch (cause?.name) {
    case 'PasswordException':
      return 'Diese PDF ist mit einem Passwort geschützt.';
    case 'InvalidPDFException':
      return 'Diese Datei ist keine gültige PDF.';
    case 'MissingPDFException':
      return 'Die Datei existiert nicht mehr.';
    default:
      return 'Die PDF ließ sich nicht anzeigen.';
  }
}
