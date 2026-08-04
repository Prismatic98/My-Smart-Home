import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActionIcon,
  Badge,
  Button,
  Group,
  Modal,
  Stack,
  Tabs,
  Text,
  TextInput,
  Tooltip,
  UnstyledButton,
} from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import {
  IconCheck,
  IconPlayerStopFilled,
  IconSearch,
  IconStar,
  IconStarFilled,
} from '@tabler/icons-react';
import { useVirtualizer } from '@tanstack/react-virtual';

import {
  effectList,
  hasMeaningfulState,
  hasNoneOption,
  isNoneOption,
  noneOptionOf,
  selectOptions,
} from '../capabilities.js';
import { activeEffect, selectLabels } from '../deviceModel.js';
import { isFavorite, rememberUse, toggleFavorite, useFavorites, useRecents } from '../favorites.js';
import { useSmartHomeServices } from '../services.js';
import EffectSwatch from './EffectSwatch.jsx';
import classes from '../SmartHome.module.scss';

/**
 * Auswahl eines Effekts – Szene, DIY, Snapshot oder Musikmodus.
 *
 * Ein Mantine-`Select` ist hier unbrauchbar: das Pixel Light bringt 243 Szenen
 * mit. Deshalb ein eigener Dialog mit Suche, Favoriten und virtualisiertem
 * Raster. Virtualisiert heißt: nur die sichtbaren Zeilen stehen im DOM, der
 * Rest ist reservierte Höhe. Ohne das ruckelt schon das Öffnen.
 *
 * Die Quellen kommen aus dem Geräte-Modell, nicht aus einer festen Liste. Ein
 * Gerät ohne DIY-Select hat keinen DIY-Tab, ohne dass hier ein Sonderfall
 * dafür steht.
 */

/** Zeilenhöhen der virtualisierten Liste. */
const HEADER_HEIGHT = 34;
const ITEMS_ROW_HEIGHT = 64;

function chunk(list, size) {
  const rows = [];
  for (let index = 0; index < list.length; index += size) {
    rows.push(list.slice(index, index + size));
  }
  return rows;
}

/**
 * Welche Auswahlquellen hat das Gerät?
 *
 * Szenen kommen bevorzugt aus `effect_list` der Lichtentität: dieselben Namen
 * wie im Scene-Select, aber über `light.turn_on` anwendbar – das schaltet die
 * Lampe gleich mit ein und der aktive Effekt ist danach ablesbar.
 */
function buildSources(device) {
  const sources = [];

  const sceneNames = device.capabilities.effects
    ? effectList(device.primary)
    : selectOptions(device.selects.scene);
  if (sceneNames.length > 0) {
    sources.push({ key: 'scene', label: selectLabels.scene, names: sceneNames });
  }

  for (const key of ['diyScene', 'snapshot', 'musicMode']) {
    const names = selectOptions(device.selects[key]);
    if (names.length > 0) sources.push({ key, label: selectLabels[key], names });
  }

  return sources;
}

/**
 * Welcher Eintrag dieser Quelle ist gerade aktiv?
 *
 * Snapshots liefern hier bewusst nie einen Wert: das Select behält seinen
 * letzten Wert für immer, auch wenn die Lampe längst etwas anderes zeigt
 * (am Gerät nachgemessen, siehe activeEffect in deviceModel.js). Ein Häkchen
 * wäre dort dauerhaft falsch.
 */
function activeNameFor(device, kind) {
  if (kind === 'scene') {
    const effect = activeEffect(device);
    return effect?.source === 'scene' ? effect.name : null;
  }
  if (kind === 'snapshot') return null;

  const select = device.selects[kind];
  return hasMeaningfulState(select) && !isNoneOption(select.state) ? select.state : null;
}

export default function EffectPicker({ device, opened, onClose }) {
  const { setEffect, selectOption } = useSmartHomeServices();
  const fullScreen = useMediaQuery('(max-width: 48em)');
  const wide = useMediaQuery('(min-width: 62em)');
  const medium = useMediaQuery('(min-width: 36em)');
  const columns = wide ? 4 : medium ? 3 : 2;

  const sources = useMemo(() => buildSources(device), [device]);
  const [tab, setTab] = useState(sources[0]?.key ?? null);
  const [query, setQuery] = useState('');

  const favorites = useFavorites(device.id);
  const recents = useRecents(device.id);
  const scrollRef = useRef(null);

  // Wechselt das Gerät die Quellen (Integration neu geladen), darf kein Tab
  // stehen bleiben, den es nicht mehr gibt.
  useEffect(() => {
    if (sources.length > 0 && !sources.some((source) => source.key === tab)) {
      setTab(sources[0].key);
    }
  }, [sources, tab]);

  const source = sources.find((entry) => entry.key === tab) ?? sources[0] ?? null;
  const activeName = source ? activeNameFor(device, source.key) : null;

  const rows = useMemo(() => {
    if (!source) return [];

    const needle = query.trim().toLowerCase();
    if (needle) {
      const hits = source.names.filter((name) => name.toLowerCase().includes(needle));
      return chunk(hits, columns).map((items) => ({ type: 'items', items }));
    }

    const known = new Set(source.names);
    const favNames = favorites
      .filter((entry) => entry.kind === source.key && known.has(entry.name))
      .map((entry) => entry.name);
    const recentNames = recents
      .filter((entry) => entry.kind === source.key && known.has(entry.name))
      .map((entry) => entry.name);

    const result = [];
    const addSection = (label, names) => {
      if (names.length === 0) return;
      result.push({ type: 'header', label });
      chunk(names, columns).forEach((items) => result.push({ type: 'items', items }));
    };

    addSection('Favoriten', favNames);
    addSection('Zuletzt verwendet', recentNames);
    // Die Überschrift „Alle" nur, wenn darüber tatsächlich etwas steht –
    // sonst ist sie eine Beschriftung für die einzige Gruppe.
    addSection(result.length > 0 ? 'Alle' : '', source.names);

    return result.filter((row) => row.type !== 'header' || row.label);
  }, [source, query, columns, favorites, recents]);

  const estimateSize = useCallback(
    (index) => (rows[index]?.type === 'header' ? HEADER_HEIGHT : ITEMS_ROW_HEIGHT),
    [rows]
  );

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize,
    overscan: 6,
  });

  // Nach Tabwechsel oder neuer Suche wieder oben anfangen – sonst schaut man
  // mitten in eine Liste, die man gerade erst gefiltert hat.
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [tab, query]);

  async function apply(name) {
    if (!source) return;

    let ok;
    if (source.key === 'scene' && device.capabilities.effects) {
      ok = await setEffect(device.primary, name);
    } else {
      const target = device.selects[source.key === 'scene' ? 'scene' : source.key];
      ok = await selectOption(target, name);
    }

    if (ok) {
      await rememberUse(device.id, source.key, name);
      onClose();
    }
  }

  /** Beendet einen laufenden Effekt über die Aus-Option des Scene-Selects. */
  async function stopEffect() {
    const select = device.selects.scene;
    if (!hasNoneOption(select)) return;
    const ok = await selectOption(select, noneOptionOf(select));
    if (ok) onClose();
  }

  const canStop = hasNoneOption(device.selects.scene);

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      fullScreen={fullScreen}
      size="xl"
      title={
        <Group gap="xs" wrap="nowrap">
          <Text fw={600}>Effekt wählen</Text>
          <Text size="sm" c="dimmed" lineClamp={1}>
            {device.name}
          </Text>
        </Group>
      }
    >
      <Stack gap="sm">
        {sources.length > 1 && (
          <Tabs value={tab} onChange={setTab} variant="pills">
            <Tabs.List>
              {sources.map((entry) => (
                <Tabs.Tab key={entry.key} value={entry.key}>
                  {entry.label}
                  <Text span size="xs" c="dimmed" ml={6}>
                    {entry.names.length}
                  </Text>
                </Tabs.Tab>
              ))}
            </Tabs.List>
          </Tabs>
        )}

        <Group gap="sm" wrap="nowrap" align="center">
          <TextInput
            flex={1}
            placeholder="Suchen…"
            leftSection={<IconSearch size={16} />}
            value={query}
            onChange={(event) => setQuery(event.currentTarget.value)}
            // Auf dem Handy nicht automatisch fokussieren: die Bildschirmtastatur
            // würde die halbe Liste verdecken, bevor man etwas gesehen hat.
            {...(fullScreen ? {} : { 'data-autofocus': true })}
          />
          {canStop && (
            <Button
              variant="light"
              color="gray"
              leftSection={<IconPlayerStopFilled size={14} />}
              onClick={stopEffect}
            >
              Effekt beenden
            </Button>
          )}
        </Group>

        {activeName && (
          <Group gap={6}>
            <Text size="xs" c="dimmed">
              Aktiv:
            </Text>
            <Badge variant="light" size="sm" leftSection={<EffectSwatch name={activeName} size="xs" />}>
              {activeName}
            </Badge>
          </Group>
        )}

        {rows.length === 0 ? (
          <Text size="sm" c="dimmed" py="xl" ta="center">
            {query ? `Nichts gefunden für „${query}".` : 'Keine Einträge vorhanden.'}
          </Text>
        ) : (
          <div
            ref={scrollRef}
            className={`${classes.pickerScroll} ${fullScreen ? classes.pickerScrollFullScreen : ''}`}
          >
            <div className={classes.pickerRows} style={{ height: virtualizer.getTotalSize() }}>
              {virtualizer.getVirtualItems().map((virtualRow) => {
                const row = rows[virtualRow.index];
                return (
                  <div
                    key={virtualRow.key}
                    className={classes.pickerRow}
                    style={{ height: virtualRow.size, transform: `translateY(${virtualRow.start}px)` }}
                  >
                    {row.type === 'header' ? (
                      <Text size="xs" fw={700} c="dimmed" tt="uppercase" pt={8}>
                        {row.label}
                      </Text>
                    ) : (
                      <div
                        className={classes.pickerGrid}
                        style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
                      >
                        {row.items.map((name) => (
                          <EffectTile
                            key={name}
                            name={name}
                            active={name === activeName}
                            pinned={isFavorite(favorites, source.key, name)}
                            onSelect={() => apply(name)}
                            onTogglePin={() => toggleFavorite(device.id, source.key, name)}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </Stack>
    </Modal>
  );
}

/**
 * Eine Kachel. Name und Anheft-Knopf sind zwei Schaltflächen nebeneinander –
 * ein Knopf im Knopf wäre ungültiges HTML und auf dem Handy nicht zu treffen.
 */
function EffectTile({ name, active, pinned, onSelect, onTogglePin }) {
  return (
    <div className={classes.effectTile} data-active={active || undefined}>
      <UnstyledButton className={classes.effectName} onClick={onSelect} title={name}>
        <EffectSwatch name={name} />
        <Text size="sm" lineClamp={2} className={classes.effectLabel}>
          {name}
        </Text>
      </UnstyledButton>

      {active && <IconCheck size={16} color="var(--mantine-color-blue-5)" />}

      <Tooltip label={pinned ? 'Favorit lösen' : 'Als Favorit anheften'} withArrow>
        <ActionIcon
          className={classes.pinButton}
          data-pinned={pinned || undefined}
          variant="subtle"
          color={pinned ? 'yellow' : 'gray'}
          size="sm"
          onClick={onTogglePin}
          aria-label={pinned ? `${name} als Favorit lösen` : `${name} als Favorit anheften`}
        >
          {pinned ? <IconStarFilled size={14} /> : <IconStar size={14} />}
        </ActionIcon>
      </Tooltip>
    </div>
  );
}
