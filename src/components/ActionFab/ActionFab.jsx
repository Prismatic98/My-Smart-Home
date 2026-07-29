import { useEffect, useState } from 'react';
import { ActionIcon, Text } from '@mantine/core';
import { useClickOutside } from '@mantine/hooks';
import { IconPlus } from '@tabler/icons-react';

import classes from './ActionFab.module.scss';

/**
 * Runder Aktionsknopf unten rechts – der eine Ort in jedem Modul, an dem
 * etwas Neues entsteht. Unten rechts, weil das die Ecke ist, die man am
 * Handy mit dem Daumen erreicht.
 *
 * Bewusst kein Mantine-Menu: das bringt immer ein Dropdown-Panel mit
 * Hintergrund mit. Hier schweben die Aktionen frei über der Seite und fahren
 * beim Öffnen gestaffelt aus dem Knopf heraus.
 *
 * Das Plus dreht sich beim Öffnen um 45° und wird dadurch zum Kreuz – ein
 * Icon-Wechsel wäre dafür unnötig.
 *
 * @param {{ key: string, label: string, icon?: Function, onClick: Function }[]} actions
 */
export default function ActionFab({ actions, label = 'Aktionen' }) {
  const [opened, setOpened] = useState(false);
  const ref = useClickOutside(() => setOpened(false));

  // Escape schließt – wie bei jedem anderen Overlay in der App auch.
  useEffect(() => {
    if (!opened) return undefined;
    const handler = (event) => {
      if (event.key === 'Escape') setOpened(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [opened]);

  const usable = actions.filter(Boolean);
  if (usable.length === 0) return null;

  return (
    <div className={classes.wrapper} ref={ref}>
      <div className={classes.actions} data-opened={opened || undefined}>
        {usable.map((action, index) => {
          const Icon = action.icon ?? IconPlus;

          return (
            <div
              key={action.key}
              className={classes.action}
              // Gestaffelt: der knopfnächste Eintrag zuerst. Beim Schließen
              // ohne Verzögerung, sonst wirkt es zäh.
              style={{ transitionDelay: opened ? `${index * 45}ms` : '0ms' }}
            >
              <Text size="sm" fw={500} className={classes.actionLabel}>
                {action.label}
              </Text>
              <ActionIcon
                size={44}
                radius="xl"
                variant="filled"
                color="blue"
                className={classes.actionButton}
                aria-label={action.label}
                tabIndex={opened ? 0 : -1}
                onClick={() => {
                  setOpened(false);
                  action.onClick();
                }}
              >
                <Icon size={20} />
              </ActionIcon>
            </div>
          );
        })}
      </div>

      <ActionIcon
        size={56}
        radius="xl"
        variant="filled"
        color="blue"
        className={classes.fab}
        aria-label={label}
        aria-expanded={opened}
        onClick={() => setOpened((current) => !current)}
      >
        <IconPlus size={26} className={classes.fabIcon} data-opened={opened || undefined} />
      </ActionIcon>
    </div>
  );
}
