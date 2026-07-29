import {
  ActionIcon,
  Button,
  Group,
  Menu,
  SegmentedControl,
  TextInput,
  Tooltip,
} from '@mantine/core';
import {
  IconArrowsSort,
  IconFolderPlus,
  IconLayoutGrid,
  IconList,
  IconRefresh,
  IconSearch,
  IconUpload,
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
 * Der Upload-Knopf löst das versteckte <input type="file"> der Seite aus –
 * auf dem Handy ist die Dateiauswahl der einzige Weg, Drag & Drop gibt es
 * dort nicht.
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
  onNewFolder,
  onUploadClick,
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

        <Group gap="xs" wrap="nowrap" className={classes.toolbarActions}>
          <Button
            variant="default"
            size="sm"
            leftSection={<IconFolderPlus size={16} />}
            onClick={onNewFolder}
          >
            Ordner
          </Button>

          <Button size="sm" leftSection={<IconUpload size={16} />} onClick={onUploadClick}>
            Hochladen
          </Button>
        </Group>
      </Group>
    </div>
  );
}
