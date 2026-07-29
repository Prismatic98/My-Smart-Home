import { ActionIcon, Menu } from '@mantine/core';
import { IconArrowRight, IconDots, IconDownload, IconPencil, IconTrash } from '@tabler/icons-react';

/**
 * Aktionen pro Eintrag. Wird sowohl vom Drei-Punkte-Knopf als auch vom
 * Rechtsklick benutzt – deshalb ist das Target austauschbar.
 */
export default function FileEntryMenu({ entry, onDownload, onRename, onMove, onDelete, children }) {
  return (
    <Menu position="bottom-end" withinPortal shadow="md" width={180}>
      <Menu.Target>
        {children ?? (
          <ActionIcon
            variant="subtle"
            color="gray"
            aria-label={`Aktionen für ${entry.name}`}
            onClick={(event) => event.stopPropagation()}
          >
            <IconDots size={18} />
          </ActionIcon>
        )}
      </Menu.Target>

      <Menu.Dropdown>
        {entry.type === 'file' && (
          <Menu.Item leftSection={<IconDownload size={16} />} onClick={() => onDownload(entry)}>
            Herunterladen
          </Menu.Item>
        )}
        <Menu.Item leftSection={<IconPencil size={16} />} onClick={() => onRename(entry)}>
          Umbenennen
        </Menu.Item>
        <Menu.Item leftSection={<IconArrowRight size={16} />} onClick={() => onMove(entry)}>
          Verschieben
        </Menu.Item>
        <Menu.Divider />
        <Menu.Item color="red" leftSection={<IconTrash size={16} />} onClick={() => onDelete(entry)}>
          Löschen
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
}
