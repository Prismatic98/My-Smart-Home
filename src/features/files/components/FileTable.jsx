import { Checkbox, Group, Table, Text, ThemeIcon, UnstyledButton } from '@mantine/core';
import { IconChevronDown, IconChevronUp } from '@tabler/icons-react';

import { formatDateTime, formatRelativeDateTime } from '../../../lib/formatDate.js';
import { fileIcon } from '../lib/fileIcon.js';
import { formatBytes } from '../lib/formatBytes.js';
import FileEntryMenu from './FileEntryMenu.jsx';
import classes from '../Files.module.scss';

/**
 * Listenansicht mit sortierbaren Spalten.
 *
 * Auf schmalen Bildschirmen bleiben nur Name und Menü stehen (die übrigen
 * Spalten blendet Files.module.scss aus) – Größe und Datum stehen dann in der
 * zweiten Zeile unter dem Namen.
 */
export default function FileTable({
  entries,
  selected,
  sort,
  onSortChange,
  onToggle,
  onToggleAll,
  onOpen,
  onDownload,
  onRename,
  onDelete,
  singleClickOpens,
}) {
  const allSelected = entries.length > 0 && entries.every((entry) => selected.has(entry.name));
  const someSelected = entries.some((entry) => selected.has(entry.name)) && !allSelected;

  return (
    <Table highlightOnHover verticalSpacing="xs" className={classes.table}>
      <Table.Thead>
        <Table.Tr>
          <Table.Th w={40}>
            <Checkbox
              size="xs"
              checked={allSelected}
              indeterminate={someSelected}
              aria-label="Alle auswählen"
              onChange={() => onToggleAll(!allSelected)}
            />
          </Table.Th>
          <Table.Th>
            <SortButton column="name" sort={sort} onSortChange={onSortChange}>
              Name
            </SortButton>
          </Table.Th>
          <Table.Th w={120} className={classes.colSize}>
            <SortButton column="size" sort={sort} onSortChange={onSortChange}>
              Größe
            </SortButton>
          </Table.Th>
          <Table.Th w={180} className={classes.colDate}>
            <SortButton column="modifiedAt" sort={sort} onSortChange={onSortChange}>
              Geändert
            </SortButton>
          </Table.Th>
          <Table.Th w={50} />
        </Table.Tr>
      </Table.Thead>

      <Table.Tbody>
        {entries.map((entry) => {
          const { icon: Icon, color } = fileIcon(entry);
          const modified = new Date(entry.modifiedAt).getTime();

          return (
            <Table.Tr
              key={entry.name}
              className={classes.row}
              data-selected={selected.has(entry.name) || undefined}
              onClick={singleClickOpens ? () => onOpen(entry) : undefined}
              onDoubleClick={singleClickOpens ? undefined : () => onOpen(entry)}
            >
              <Table.Td onClick={(event) => event.stopPropagation()}>
                <Checkbox
                  size="xs"
                  checked={selected.has(entry.name)}
                  aria-label={`${entry.name} auswählen`}
                  onChange={() => onToggle(entry.name)}
                />
              </Table.Td>

              <Table.Td>
                <Group gap="sm" wrap="nowrap">
                  <ThemeIcon variant="light" color={color} size="md" radius="sm">
                    <Icon size={16} />
                  </ThemeIcon>
                  <div className={classes.nameCell}>
                    <Text size="sm" fw={500} lineClamp={1} title={entry.name}>
                      {entry.name}
                    </Text>
                    <Text size="xs" c="dimmed" className={classes.nameMeta}>
                      {entry.type === 'dir' ? 'Ordner' : formatBytes(entry.size)}
                      {' · '}
                      {formatRelativeDateTime(modified)}
                    </Text>
                  </div>
                </Group>
              </Table.Td>

              <Table.Td className={classes.colSize}>
                <Text size="sm" c="dimmed">
                  {entry.type === 'dir' ? '–' : formatBytes(entry.size)}
                </Text>
              </Table.Td>

              <Table.Td className={classes.colDate}>
                <Text size="sm" c="dimmed" title={formatDateTime(modified)}>
                  {formatRelativeDateTime(modified)}
                </Text>
              </Table.Td>

              <Table.Td onClick={(event) => event.stopPropagation()}>
                <FileEntryMenu
                  entry={entry}
                  onDownload={onDownload}
                  onRename={onRename}
                  onDelete={onDelete}
                />
              </Table.Td>
            </Table.Tr>
          );
        })}
      </Table.Tbody>
    </Table>
  );
}

function SortButton({ column, sort, onSortChange, children }) {
  const active = sort.column === column;
  const Chevron = sort.direction === 'asc' ? IconChevronUp : IconChevronDown;

  return (
    <UnstyledButton
      className={classes.sortButton}
      onClick={() =>
        onSortChange({
          column,
          direction: active && sort.direction === 'asc' ? 'desc' : 'asc',
        })
      }
    >
      <Group gap={4} wrap="nowrap">
        <Text size="xs" fw={600} c={active ? undefined : 'dimmed'}>
          {children}
        </Text>
        {active && <Chevron size={14} />}
      </Group>
    </UnstyledButton>
  );
}
