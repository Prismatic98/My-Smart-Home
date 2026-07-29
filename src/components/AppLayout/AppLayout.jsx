import { NavLink as RouterNavLink, Outlet, useLocation } from 'react-router-dom';
import { AppShell, Burger, Group, NavLink, ScrollArea, Text, ThemeIcon } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconHome } from '@tabler/icons-react';

import { modules } from '../../lib/modules.js';
import ColorSchemeToggle from '../ColorSchemeToggle/ColorSchemeToggle.jsx';
import { NavigationProvider } from './NavigationContext.jsx';
import classes from './AppLayout.module.scss';

const navItems = [
  { key: 'home', path: '/', label: 'Übersicht', icon: IconHome, color: 'blue' },
  ...modules,
];

export default function AppLayout() {
  const [mobileOpened, { toggle: toggleMobile, close: closeMobile }] = useDisclosure(false);
  const { pathname } = useLocation();

  return (
    // Der Aktionsknopf der Feature-Seiten liegt fest über dem Inhalt und muss
    // wissen, wann die Navigation aufgeklappt ist – sonst schwebt er darüber.
    <NavigationProvider mobileOpened={mobileOpened}>
      <AppShell
        header={{ height: 56 }}
        navbar={{
          width: 260,
          breakpoint: 'sm',
          collapsed: { mobile: !mobileOpened },
        }}
        padding="md"
      >
        <AppShell.Header>
          <Group h="100%" px="md" justify="space-between" wrap="nowrap">
            <Group gap="sm" wrap="nowrap">
              <Burger opened={mobileOpened} onClick={toggleMobile} hiddenFrom="sm" size="sm" />
              <ThemeIcon variant="light" radius="md" size="lg" visibleFrom="sm">
                <IconHome size={20} />
              </ThemeIcon>
              <Text fw={650} size="lg" className={classes.brand}>
                Smart Home
              </Text>
            </Group>
            <ColorSchemeToggle />
          </Group>
        </AppShell.Header>
  
        <AppShell.Navbar p="sm">
          <AppShell.Section grow component={ScrollArea}>
            {navItems.map((item) => (
              <NavLink
                key={item.key}
                component={RouterNavLink}
                to={item.path}
                end={item.path === '/'}
                label={item.label}
                active={
                  item.path === '/' ? pathname === '/' : pathname.startsWith(item.path)
                }
                leftSection={
                  <ThemeIcon variant="light" color={item.color} size="md" radius="md">
                    <item.icon size={16} />
                  </ThemeIcon>
                }
                onClick={closeMobile}
                className={classes.navLink}
              />
            ))}
          </AppShell.Section>
  
          <AppShell.Section className={classes.navFooter}>
            <Text size="xs" c="dimmed">
              Läuft auf dem Raspberry Pi · via Tailscale
            </Text>
          </AppShell.Section>
        </AppShell.Navbar>
  
        <AppShell.Main>
          <Outlet />
        </AppShell.Main>
      </AppShell>
    </NavigationProvider>
  );
}