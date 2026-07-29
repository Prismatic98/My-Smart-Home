import { ActionIcon, Menu, Tooltip } from '@mantine/core';
import { IconFolderPlus, IconPlus, IconUpload } from '@tabler/icons-react';

import classes from '../Files.module.scss';

/**
 * Runder Aktionsknopf unten rechts – der eine Ort, an dem etwas Neues
 * entsteht. Auf dem Handy ist die untere rechte Ecke mit dem Daumen
 * erreichbar, oben rechts in der Werkzeugleiste war es das nicht.
 *
 * Weitere Aktionen kommen einfach als zusätzlicher Menüeintrag dazu.
 */
export default function FilesFab({ onUpload, onNewFolder }) {
  return (
    <Menu position="top-end" withinPortal shadow="md" width={210} offset={12}>
      <Menu.Target>
        <Tooltip label="Neu" position="left" withArrow>
          <ActionIcon
            size={56}
            radius="xl"
            variant="filled"
            color="teal"
            className={classes.fab}
            aria-label="Neu: hochladen oder Ordner anlegen"
          >
            <IconPlus size={26} />
          </ActionIcon>
        </Tooltip>
      </Menu.Target>

      <Menu.Dropdown>
        <Menu.Item leftSection={<IconUpload size={16} />} onClick={onUpload}>
          Dateien hochladen
        </Menu.Item>
        <Menu.Item leftSection={<IconFolderPlus size={16} />} onClick={onNewFolder}>
          Neuer Ordner
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
}
