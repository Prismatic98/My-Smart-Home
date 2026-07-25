import { Link } from 'react-router-dom';
import { Badge, Card, Group, Text, ThemeIcon } from '@mantine/core';

import classes from './ModuleCard.module.scss';

/**
 * Kachel für ein Modul auf der Startseite.
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
      <Group justify="space-between" align="flex-start" wrap="nowrap" mb="sm">
        <ThemeIcon variant="light" color={module.color} size={42} radius="md">
          <Icon size={22} />
        </ThemeIcon>
        <Badge variant="light" color="gray" size="sm">
          {module.status}
        </Badge>
      </Group>

      <Text fw={600} size="lg">
        {module.label}
      </Text>
      <Text c="dimmed" size="sm" mt={4}>
        {module.description}
      </Text>
    </Card>
  );
}