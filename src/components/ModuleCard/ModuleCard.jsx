import { Link } from 'react-router-dom';
import { Card, Group, Text, ThemeIcon } from '@mantine/core';

import classes from './ModuleCard.module.scss';

/**
 * Kachel für ein Modul auf der Startseite: Icon und Name, sonst nichts.
 * Erklärtexte braucht es hier nicht – wer die App benutzt, kennt die Module.
 */
export default function ModuleCard({ module }) {
  const Icon = module.icon;

  return (
    <Card
      component={Link}
      to={module.path}
      withBorder
      radius="md"
      padding="lg"
      className={classes.card}
    >
      <Group gap="md" wrap="nowrap">
        <ThemeIcon variant="light" color={module.color} size={42} radius="md">
          <Icon size={22} />
        </ThemeIcon>
        <Text fw={600} size="lg">
          {module.label}
        </Text>
      </Group>
    </Card>
  );
}
