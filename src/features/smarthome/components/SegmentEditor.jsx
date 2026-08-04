import { useMemo, useRef, useState } from 'react';
import {
  Alert,
  Badge,
  Button,
  Collapse,
  ColorInput,
  ColorPicker,
  Group,
  Progress,
  Stack,
  Text,
  UnstyledButton,
} from '@mantine/core';
import {
  IconChevronDown,
  IconChevronUp,
  IconColorSwatch,
  IconInfoCircle,
} from '@tabler/icons-react';

import { colorHex, hexToRgb, isUnavailable, rgbToHex, segmentIndex } from '../capabilities.js';
import { useSmartHomeServices } from '../services.js';
import classes from '../SmartHome.module.scss';

/**
 * Farbsteuerung der einzelnen LED-Abschnitte eines Geräts.
 *
 * Dargestellt als Streifen in Segmentreihenfolge, nicht als Liste aus 15
 * Kacheln: die Reihenfolge ist die eigentliche Information, und ein Streifen
 * zeigt sofort, wie die Kette gerade aussieht.
 *
 * Bedienregel, bewusst wie in der Dateiablage: ein Antippen bedeutet genau eine
 * Sache – hier „Segment auswählen". Der Farbwähler darunter gilt für die
 * Auswahl. Ein einzeln ausgewähltes Segment ist damit der Fall „Farbe für
 * dieses Segment", ohne dass Antippen zwei Dinge gleichzeitig heißt.
 *
 * Segmente haben absichtlich KEIN An/Aus und KEINE Helligkeit. Home Assistant
 * liefert die Entitäten nominell mit Power-State, aber das Gerät kennt keinen
 * einzeln abschaltbaren Abschnitt – ein Schalter dort würde nur widersprüchliche
 * Zustände erzeugen.
 *
 * Kosten: jede Segmentfarbe ist eine eigene Anfrage an die Cloud-API. Deshalb
 * sendet der Farbwähler nie während des Ziehens, sondern erst auf Knopfdruck,
 * und Reihen werden sequenziell mit Abstand geschrieben (siehe services.js).
 */

const DEFAULT_PAINT = '#ffffff';

/** Farbverlauf über `count` Segmente, linear im RGB-Raum interpoliert. */
function gradientColors(fromHex, toHex, count) {
  const from = hexToRgb(fromHex);
  const to = hexToRgb(toHex);
  if (!from || !to || count === 0) return [];

  return Array.from({ length: count }, (_, index) => {
    const t = count === 1 ? 0 : index / (count - 1);
    return rgbToHex([
      from[0] + (to[0] - from[0]) * t,
      from[1] + (to[1] - from[1]) * t,
      from[2] + (to[2] - from[2]) * t,
    ]);
  });
}

export default function SegmentEditor({ device, disabled = false }) {
  const { applySegmentColors } = useSmartHomeServices();
  const { segments } = device;

  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(() => new Set());
  const [paint, setPaint] = useState(DEFAULT_PAINT);
  const [gradientFrom, setGradientFrom] = useState('#ff8787');
  const [gradientTo, setGradientTo] = useState('#4dabf7');
  const [progress, setProgress] = useState(null);

  const cancelled = useRef(false);
  // `busy` steuert die Fortschrittsanzeige und darf deshalb nur laufen heißen.
  // `locked` ist die Frage, ob gerade überhaupt etwas gesendet werden darf –
  // während eines Laufs oder wenn das Gerät nicht erreichbar ist.
  const busy = progress !== null;
  const locked = busy || disabled;

  const available = useMemo(
    () => segments.filter((segment) => !isUnavailable(segment)),
    [segments]
  );

  if (segments.length === 0) return null;

  function toggleSegment(entityId) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(entityId)) next.delete(entityId);
      else next.add(entityId);
      return next;
    });
  }

  /** Schreibt eine Liste von (Segment, Farbe) sequenziell mit Fortschritt. */
  async function run(entries) {
    if (entries.length === 0) return;

    cancelled.current = false;
    setProgress({ done: 0, total: entries.length });

    await applySegmentColors(entries, {
      onProgress: (done, total) => setProgress({ done, total }),
      isCancelled: () => cancelled.current,
    });

    setProgress(null);
  }

  const selectedSegments = available.filter((segment) => selected.has(segment.entity_id));

  const paintSelection = () =>
    run(selectedSegments.map((segment) => ({ entity: segment, hex: paint })));

  const paintAll = () => run(available.map((segment) => ({ entity: segment, hex: paint })));

  const paintGradient = () => {
    const colors = gradientColors(gradientFrom, gradientTo, available.length);
    run(available.map((segment, index) => ({ entity: segment, hex: colors[index] })));
  };

  const reset = () =>
    run(available.map((segment) => ({ entity: segment, hex: DEFAULT_PAINT })));

  return (
    <Stack gap="xs">
      <Group justify="space-between" wrap="nowrap">
        <Group gap="xs" wrap="nowrap">
          <IconColorSwatch size={18} />
          <Text fw={600}>Segmente</Text>
          <Badge variant="light" size="sm">
            {segments.length}
          </Badge>
        </Group>
        <Button
          variant="subtle"
          size="compact-sm"
          onClick={() => setOpen((value) => !value)}
          rightSection={open ? <IconChevronUp size={14} /> : <IconChevronDown size={14} />}
        >
          {open ? 'Einklappen' : 'Bearbeiten'}
        </Button>
      </Group>

      <Collapse expanded={open}>
        <Stack gap="sm" pt={4}>
          <div className={classes.segmentStrip}>
            {segments.map((segment) => {
              const unavailable = isUnavailable(segment);
              const index = segmentIndex(segment);
              // Meldet das Segment keine Farbe (aus, oder noch nie gemeldet),
              // wird die Variable NICHT gesetzt – sonst überschriebe ein
              // `transparent` die Rückfallfarbe aus dem Stylesheet und das Feld
              // verschwände auf dem Kartenhintergrund.
              const color = colorHex(segment);
              return (
                <UnstyledButton
                  key={segment.entity_id}
                  className={classes.segment}
                  style={color ? { '--segment-color': color } : undefined}
                  data-unknown={color ? undefined : true}
                  data-selected={selected.has(segment.entity_id) || undefined}
                  disabled={unavailable || locked}
                  onClick={() => toggleSegment(segment.entity_id)}
                  aria-label={`Segment ${index}${
                    selected.has(segment.entity_id) ? ', ausgewählt' : ''
                  }`}
                  aria-pressed={selected.has(segment.entity_id)}
                >
                  <span className={classes.segmentIndex}>{index}</span>
                </UnstyledButton>
              );
            })}
          </div>

          <Group gap="xs">
            <Text size="xs" c="dimmed" flex={1}>
              {selected.size > 0
                ? `${selected.size} von ${segments.length} ausgewählt`
                : 'Segmente antippen, um sie auszuwählen'}
            </Text>
            <Button
              variant="subtle"
              size="compact-xs"
              disabled={locked}
              onClick={() => setSelected(new Set(available.map((s) => s.entity_id)))}
            >
              Alle
            </Button>
            <Button
              variant="subtle"
              size="compact-xs"
              disabled={locked || selected.size === 0}
              onClick={() => setSelected(new Set())}
            >
              Keine
            </Button>
          </Group>

          <ColorPicker
            format="hex"
            value={paint}
            onChange={setPaint}
            fullWidth
            swatches={[
              '#ffffff',
              '#ffe8cc',
              '#ffc078',
              '#ff8787',
              '#f783ac',
              '#b197fc',
              '#748ffc',
              '#4dabf7',
              '#38d9a9',
              '#69db7c',
              '#ffd43b',
              '#000000',
            ]}
            swatchesPerRow={6}
          />

          <Group gap="xs">
            <Button
              size="xs"
              disabled={locked || selected.size === 0}
              onClick={paintSelection}
            >
              Auswahl färben ({selected.size})
            </Button>
            <Button size="xs" variant="light" disabled={locked} onClick={paintAll}>
              Alle gleich
            </Button>
            <Button size="xs" variant="light" color="gray" disabled={locked} onClick={reset}>
              Zurücksetzen
            </Button>
          </Group>

          <Group gap="xs" align="flex-end" wrap="nowrap">
            <ColorInput
              label="Verlauf von"
              size="xs"
              format="hex"
              value={gradientFrom}
              onChange={setGradientFrom}
              withEyeDropper={false}
              flex={1}
            />
            <ColorInput
              label="bis"
              size="xs"
              format="hex"
              value={gradientTo}
              onChange={setGradientTo}
              withEyeDropper={false}
              flex={1}
            />
            <Button size="xs" variant="light" disabled={locked} onClick={paintGradient}>
              Verlauf
            </Button>
          </Group>

          {busy ? (
            <Stack gap={6}>
              <Group justify="space-between">
                <Text size="xs" c="dimmed">
                  Segmente werden gesetzt… {progress.done} / {progress.total}
                </Text>
                <Button
                  size="compact-xs"
                  variant="subtle"
                  color="red"
                  onClick={() => {
                    cancelled.current = true;
                  }}
                >
                  Abbrechen
                </Button>
              </Group>
              <Progress value={(progress.done / progress.total) * 100} animated />
            </Stack>
          ) : (
            <Alert
              variant="light"
              color="gray"
              icon={<IconInfoCircle size={16} />}
              p="xs"
              radius="sm"
            >
              <Text size="xs">
                Jede Segmentfarbe ist eine eigene Anfrage an die Hersteller-Cloud. „Alle
                gleich" und „Verlauf" kosten {available.length} Anfragen und laufen deshalb
                nacheinander.
              </Text>
            </Alert>
          )}
        </Stack>
      </Collapse>
    </Stack>
  );
}
