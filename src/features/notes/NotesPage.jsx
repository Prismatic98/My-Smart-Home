import { Alert, Container } from '@mantine/core';
import { IconInfoCircle } from '@tabler/icons-react';

import PageHeader from '../../components/PageHeader/PageHeader.jsx';

export default function NotesPage() {
  return (
    <Container size="lg" px={0}>
      <PageHeader
        title="Notizen"
        badge="geplant"
        description="Notizen anlegen und bearbeiten – offline-fähig über IndexedDB, Sync mit dem Backend."
      />
      <Alert variant="light" color="yellow" icon={<IconInfoCircle size={18} />}>
        Platzhalter. Hier entstehen später die Notizen-Liste, der Editor und die
        Offline-Synchronisation (Dexie + TanStack Query).
      </Alert>
    </Container>
  );
}