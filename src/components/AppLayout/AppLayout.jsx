import { NavLink as RouterNavLink, Outlet, useLocation } from 'react-router-dom';
import { AppShell, Burger, Group, NavLink, ScrollArea, Text, ThemeIcon } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconHome, IconSettings } from '@tabler/icons-react';

import { modules } from '../../lib/modules.js';
import BackButton from './BackButton.jsx';
import { NavigationProvider } from './NavigationContext.jsx';
import classes from './AppLayout.module.scss';

const navItems = [
  { key: 'home', path: '/', label: 'Übersicht', icon: IconHome, color: 'blue' },
  ...modules,
];

export default function AppLayout() {
  const [mobileOpened, { toggle: toggleMobile, close: closeMobile }] = useDisclosure(false);
  const { pathname } = useLocation();
  const isHome = pathname === '/';

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
          {/* Links steht der Weg zurück, rechts der Weg ins Menü. Auf dem
              Handy ist die linke obere Ecke die einzige, die der Daumen nicht
              erreicht – dort gehört das hin, was man nicht versehentlich
              treffen will.

              Der Name steht mittig und rührt sich nicht: die beiden Seiten
              teilen den Platz links und rechts von ihm zu gleichen Teilen
              (`flex: 1 1 0`), deshalb bleibt er stehen, egal was daneben
              erscheint oder verschwindet – Pfeil oder Haus, Burger oder
              nichts. Neben dem Zurück-Pfeil geführt sprang er bei jedem
              Seitenwechsel um dessen Breite. */}
          <Group h="100%" px="md" gap="sm" wrap="nowrap">
            <Group gap="sm" wrap="nowrap" className={classes.headerSide}>
              {isHome ? (
                <ThemeIcon variant="light" radius="md" size="lg" visibleFrom="sm">
                  <IconHome size={20} />
                </ThemeIcon>
              ) : (
                <BackButton />
              )}
            </Group>

            <Text fw={650} size="lg" className={classes.brand}>
              Smart Home
            </Text>

            <Group gap="sm" wrap="nowrap" justify="flex-end" className={classes.headerSide}>
              <Burger opened={mobileOpened} onClick={toggleMobile} hiddenFrom="sm" size="sm" />
            </Group>
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
  
          {/* Einstellungen stehen unten und nicht bei den Modulen: sie sind
              kein Ort, an dem man etwas tut, sondern einer, an dem man etwas
              einmal einstellt. Deshalb auch keine Kachel auf der Startseite. */}
          <AppShell.Section className={classes.navFooter}>
            <NavLink
              component={RouterNavLink}
              to="/settings"
              label="Einstellungen"
              active={pathname.startsWith('/settings')}
              leftSection={
                <ThemeIcon variant="light" color="gray" size="md" radius="md">
                  <IconSettings size={16} />
                </ThemeIcon>
              }
              onClick={closeMobile}
              className={classes.navLink}
            />
            <Text size="xs" c="dimmed" mt="xs">
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