import { Alert, Container } from '@mantine/core';
import { IconInfoCircle } from '@tabler/icons-react';

import PageHeader from '../../components/PageHeader/PageHeader.jsx';

export default function SmartHomePage() {
  return (
    <Container size="lg" px={0}>
      <PageHeader
        title="Smart Home"
        badge="geplant"
        description="Geräte und Automationen – ausschließlich über die APIs von Home Assistant."
      />
      <Alert variant="light" color="blue" icon={<IconInfoCircle size={18} />}>
        Platzhalter. Hier entstehen später Geräteliste, Status und Schalter – angebunden
        an die REST- und WebSocket-API von Home Assistant.
      </Alert>
    </Container>
  );
}