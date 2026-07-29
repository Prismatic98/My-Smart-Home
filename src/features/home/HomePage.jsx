import { Container, SimpleGrid } from '@mantine/core';

import ModuleCard from '../../components/ModuleCard/ModuleCard.jsx';
import { modules } from '../../lib/modules.js';

/** Startseite: nur die Modulkacheln, kein Begrüßungstext. */
export default function HomePage() {
  return (
    <Container size="lg" px={0}>
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
        {modules.map((module) => (
          <ModuleCard key={module.key} module={module} />
        ))}
      </SimpleGrid>
    </Container>
  );
}
