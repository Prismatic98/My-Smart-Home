import { Alert, Container } from '@mantine/core';
import { IconInfoCircle } from '@tabler/icons-react';

import PageHeader from '../../components/PageHeader/PageHeader.jsx';

export default function FilesPage() {
  return (
    <Container size="lg" px={0}>
      <PageHeader
        title="Datenablage"
        badge="geplant"
        description="Dateien von überall hochladen – gespeichert auf der SSD des Raspberry Pi."
      />
      <Alert variant="light" color="teal" icon={<IconInfoCircle size={18} />}>
        Platzhalter. Hier entstehen später Upload (multipart), Dateiliste und Download.
      </Alert>
    </Container>
  );
}