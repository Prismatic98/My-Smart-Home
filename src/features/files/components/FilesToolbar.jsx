import { ActionIcon, Group, Menu, SegmentedControl, TextInput, Tooltip } from '@mantine/core';
import {
  IconArrowsSort,
  IconLayoutGrid,
  IconList,
  IconRefresh,
  IconSearch,
  IconX,
} from '@tabler/icons-react';

import FilesBreadcrumbs from './FilesBreadcrumbs.jsx';
import classes from '../Files.module.scss';

const SORT_OPTIONS = [
  { value: 'name', label: 'Name' },
  { value: 'size', label: 'Größe' },
  { value: 'modifiedAt', label: 'Geändert' },
];

/**
 * Kopfzeile des Dateibrowsers: wo bin ich, was suche ich, wie sehe ich es an,
 * und was kann ich hier anlegen.
 *
 * Hochladen und „Neuer Ordner" sitzen bewusst nicht hier, sondern im runden
 * Aktionsknopf unten rechts (FilesFab) – dort sind sie auch auf dem Handy mit
 * dem Daumen erreichbar.
 */
export default function FilesToolbar({
  path,
  onNavigate,
  search,
  onSearchChange,
  view,
  onViewChange,
  sort,
  onSortChange,
  onRefresh,
  isFetching,
}) {
  return (
    <div className={classes.toolbar}>
      <Group justify="space-between" wrap="nowrap" gap="xs" mb="xs">
        <FilesBreadcrumbs path={path} onNavigate={onNavigate} />

        <Group gap={4} wrap="nowrap">
          <Tooltip label="Neu laden" withArrow>
            <ActionIcon variant="subtle" color="gray" onClick={onRefresh} loading={isFetching}>
              <IconRefresh size={18} />
            </ActionIcon>
          </Tooltip>

          <Menu position="bottom-end" withinPortal shadow="md">
            <Menu.Target>
              <Tooltip label="Sortierung" withArrow>
                <ActionIcon variant="subtle" color="gray" aria-label="Sortierung">
                  <IconArrowsSort size={18} />
                </ActionIcon>
              </Tooltip>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Label>Sortieren nach</Menu.Label>
              {SORT_OPTIONS.map((option) => (
                <Menu.Item
                  key={option.value}
                  onClick={() => onSortChange({ ...sort, column: option.value })}
                  fw={sort.column === option.value ? 600 : undefined}
                >
                  {option.label}
                </Menu.Item>
              ))}
              <Menu.Divider />
              <Menu.Item
                onClick={() =>
                  onSortChange({ ...sort, direction: sort.direction === 'asc' ? 'desc' : 'asc' })
                }
              >
                {sort.direction === 'asc' ? 'Absteigend sortieren' : 'Aufsteigend sortieren'}
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>

          <SegmentedControl
            size="xs"
            value={view}
            onChange={onViewChange}
            data={[
              { value: 'grid', label: <IconLayoutGrid size={16} /> },
              { value: 'list', label: <IconList size={16} /> },
            ]}
          />
        </Group>
      </Group>

      <Group gap="xs" wrap="wrap">
        <TextInput
          className={classes.search}
          size="sm"
          placeholder="In diesem Ordner suchen"
          leftSection={<IconSearch size={16} />}
          value={search}
          onChange={(event) => onSearchChange(event.currentTarget.value)}
          rightSection={
            search ? (
              <ActionIcon variant="subtle" color="gray" size="sm" onClick={() => onSearchChange('')}>
                <IconX size={14} />
              </ActionIcon>
            ) : null
          }
        />

      </Group>
    </div>
  );
}
