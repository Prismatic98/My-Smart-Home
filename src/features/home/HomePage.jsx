import { Container, SimpleGrid, Text, Title } from '@mantine/core';

import ModuleCard from '../../components/ModuleCard/ModuleCard.jsx';
import { modules } from '../../lib/modules.js';
import classes from './HomePage.module.scss';

export default function HomePage() {
  return (
    <Container size="lg" px={0}>
      <div className={classes.hero}>
        <Title order={1} className={classes.title}>
          Willkommen zuhause
        </Title>
        <Text c="dimmed" mt="xs">
          Deine Zentrale für Notizen, Dateien und das Smart Home – erreichbar von überall.
        </Text>
      </div>

      <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
        {modules.map((module) => (
          <ModuleCard key={module.key} module={module} />
        ))}
      </SimpleGrid>
    </Container>
  );
}