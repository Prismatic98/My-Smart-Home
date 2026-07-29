import { Anchor, Breadcrumbs, Menu, Text, UnstyledButton } from '@mantine/core';
import { IconDots, IconFolder } from '@tabler/icons-react';

import classes from '../Files.module.scss';

/**
 * Pfad-Navigation. Bei tiefer Verschachtelung klappen die mittleren Segmente
 * in ein Menü – sonst bricht die Zeile auf dem Handy um oder schiebt die
 * Werkzeugleiste weg.
 */

/** So viele Segmente bleiben am Ende immer sichtbar (plus die Wurzel). */
const VISIBLE_TAIL = 2;

export default function FilesBreadcrumbs({ path, onNavigate }) {
  const segments = path.split('/').filter(Boolean);

  const crumbs = [
    { label: 'Ablage', path: '/', icon: true },
    ...segments.map((name, index) => ({
      label: name,
      path: `/${segments.slice(0, index + 1).join('/')}`,
    })),
  ];

  const collapse = crumbs.length > VISIBLE_TAIL + 2;
  const hidden = collapse ? crumbs.slice(1, crumbs.length - VISIBLE_TAIL) : [];
  const shown = collapse
    ? [crumbs[0], null, ...crumbs.slice(crumbs.length - VISIBLE_TAIL)]
    : crumbs;

  return (
    <Breadcrumbs separator="/" className={classes.breadcrumbs}>
      {shown.map((crumb, index) => {
        if (crumb === null) {
          return (
            <Menu key="overflow" position="bottom-start" withinPortal shadow="md">
              <Menu.Target>
                <UnstyledButton aria-label="Übergangene Ordner anzeigen" className={classes.crumbButton}>
                  <IconDots size={16} />
                </UnstyledButton>
              </Menu.Target>
              <Menu.Dropdown>
                {hidden.map((item) => (
                  <Menu.Item
                    key={item.path}
                    leftSection={<IconFolder size={16} />}
                    onClick={() => onNavigate(item.path)}
                  >
                    {item.label}
                  </Menu.Item>
                ))}
              </Menu.Dropdown>
            </Menu>
          );
        }

        const isLast = index === shown.length - 1;

        if (isLast) {
          return (
            <Text key={crumb.path} fw={600} size="sm" className={classes.crumbCurrent}>
              {crumb.label}
            </Text>
          );
        }

        return (
          <Anchor
            key={crumb.path}
            size="sm"
            c="dimmed"
            onClick={() => onNavigate(crumb.path)}
            className={classes.crumbLink}
          >
            {crumb.label}
          </Anchor>
        );
      })}
    </Breadcrumbs>
  );
}
