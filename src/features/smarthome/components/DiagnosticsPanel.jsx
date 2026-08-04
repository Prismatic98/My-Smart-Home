import { Button, Collapse, Group, Stack, Table, Text } from '@mantine/core';
import { IconChevronDown, IconChevronUp, IconStethoscope } from '@tabler/icons-react';

import { formatRelativeDateTime } from '../../../lib/formatDate.js';
import { shortLabel } from '../deviceModel.js';

/**
 * Diagnosewerte eines Geräts – zusammengeklappt und ganz unten.
 *
 * Das sind Entitäten mit `entity_category: 'diagnostic'`. Sie sind nützlich,
 * wenn etwas nicht funktioniert („wann kam die letzte Rückmeldung?"), gehören
 * aber nicht in die Bedienoberfläche. Home Assistant markiert sie selbst so;
 * wir übernehmen diese Einordnung, statt eine eigene Liste zu pflegen.
 */
export default function DiagnosticsPanel({ device, expanded, onToggle }) {
  const { diagnostics } = device;
  if (diagnostics.length === 0) return null;

  return (
    <Stack gap="xs">
      <Group justify="space-between" wrap="nowrap">
        <Group gap="xs" wrap="nowrap">
          <IconStethoscope size={16} />
          <Text size="sm" c="dimmed">
            Diagnose
          </Text>
        </Group>
        <Button
          variant="subtle"
          size="compact-sm"
          color="gray"
          onClick={onToggle}
          rightSection={expanded ? <IconChevronUp size={14} /> : <IconChevronDown size={14} />}
        >
          {expanded ? 'Verbergen' : 'Anzeigen'}
        </Button>
      </Group>

      <Collapse expanded={expanded}>
        <Table withTableBorder verticalSpacing={6} fz="xs">
          <Table.Tbody>
            {diagnostics.map((entity) => (
              <Table.Tr key={entity.entity_id}>
                <Table.Td c="dimmed">{shortLabel(entity, device.name)}</Table.Td>
                <Table.Td ta="right">{formatDiagnosticState(entity)}</Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Collapse>
    </Stack>
  );
}

/**
 * Zeitstempel als „vor 5 Minuten" – bei `last_update_received` ist der Abstand
 * die Information, nicht die Uhrzeit. Alles andere bleibt, wie es kommt.
 */
function formatDiagnosticState(entity) {
  if (entity.state === 'unknown') return '—';
  if (entity.state === 'unavailable') return 'nicht erreichbar';

  const asDate = Date.parse(entity.state);
  if (!Number.isNaN(asDate) && /^\d{4}-\d{2}-\d{2}T/.test(entity.state)) {
    return formatRelativeDateTime(asDate);
  }

  const unit = entity.attributes?.unit_of_measurement;
  return unit ? `${entity.state} ${unit}` : entity.state;
}
