import { Badge, Group, Stack, Text, Title } from '@mantine/core';

/**
 * Einheitlicher Seitenkopf für alle Feature-Seiten.
 */
export default function PageHeader({ title, description, badge }) {
  return (
    <Stack gap={4} mb="lg">
      <Group gap="sm">
        <Title order={2}>{title}</Title>
        {badge && (
          <Badge variant="light" color="gray" size="sm">
            {badge}
          </Badge>
        )}
      </Group>
      {description && (
        <Text c="dimmed" size="sm">
          {description}
        </Text>
      )}
    </Stack>
  );
}