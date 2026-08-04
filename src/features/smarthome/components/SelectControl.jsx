import { ActionIcon, Group, Select, Tooltip } from '@mantine/core';
import { IconPlayerStopFilled } from '@tabler/icons-react';

import {
  hasMeaningfulState,
  hasNoneOption,
  isNoneOption,
  isUnavailable,
  noneOptionOf,
  selectOptions,
} from '../capabilities.js';
import { shortLabel } from '../deviceModel.js';
import { useOptimisticValue } from '../useOptimisticValue.js';
import { useSmartHomeServices } from '../services.js';

/**
 * Bedienelement für eine beliebige select-Entität.
 *
 * Absichtlich generisch: die Komponente kennt keine Suffixe und keine
 * Bedeutungen. Damit lässt sie sich für den Musikmodus genauso verwenden wie
 * für ein Select, das eine künftige Integration mitbringt und das dieses Modul
 * noch nicht kennt.
 *
 * Für Listen mit hunderten Einträgen (Szenen) ist sie NICHT gedacht – dort
 * übernimmt EffectPicker. Ein Select mit 243 Optionen ist unbenutzbar.
 */
export default function SelectControl({
  entity,
  deviceName,
  label,
  placeholder = 'Nicht gesetzt',
  disabled = false,
}) {
  const { selectOption } = useSmartHomeServices();
  const options = selectOptions(entity);
  const unavailable = disabled || isUnavailable(entity);

  // Ein Zustand, der nicht in den Optionen steht (oder "None" ist), zeigt sich
  // als leeres Feld – sonst behauptet das Select einen Wert, den es nicht gibt.
  const liveValue =
    hasMeaningfulState(entity) && !isNoneOption(entity.state) && options.includes(entity.state)
      ? entity.state
      : null;
  const [value, setValue] = useOptimisticValue(liveValue);

  async function handleChange(next) {
    if (!next) return;
    setValue(next);
    const ok = await selectOption(entity, next);
    if (!ok) setValue(null);
  }

  async function clear() {
    const none = noneOptionOf(entity);
    setValue(null);
    await selectOption(entity, none);
  }

  return (
    <Group gap="xs" wrap="nowrap" align="flex-end">
      <Select
        flex={1}
        size="sm"
        label={label ?? shortLabel(entity, deviceName)}
        placeholder={unavailable ? 'nicht erreichbar' : placeholder}
        data={options}
        value={value}
        onChange={handleChange}
        disabled={unavailable || options.length === 0}
        searchable={options.length > 12}
        nothingFoundMessage="Nichts gefunden"
        comboboxProps={{ withinPortal: true }}
      />

      {hasNoneOption(entity) && (
        <Tooltip label="Zurücksetzen" withArrow>
          <ActionIcon
            variant="light"
            color="gray"
            size="lg"
            disabled={unavailable || !value}
            onClick={clear}
            aria-label="Auswahl zurücksetzen"
          >
            <IconPlayerStopFilled size={14} />
          </ActionIcon>
        </Tooltip>
      )}
    </Group>
  );
}
