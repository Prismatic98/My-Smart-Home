import { Link } from 'react-router-dom';
import { Button, Container, Text, Title } from '@mantine/core';
import { IconArrowLeft } from '@tabler/icons-react';

import DistortionList from './components/DistortionList.jsx';
import classes from './Clarity.module.scss';

/**
 * Der Denkfehler-Katalog als Nachschlagewerk.
 *
 * Eigene Seite, weil man ihn auch ohne offenes Protokoll lesen will – etwa
 * dann, wenn in der Sitzung ein Name gefallen ist. Es gibt hier nichts
 * auszuwählen und nichts zu speichern.
 *
 * Die Beschreibungen sind eigenständig formuliert und stammen nicht aus
 * fremden Arbeitsblättern; die Herleitung steht in
 * docs/clarity-fachliche-grundlagen.md und bewusst nicht hier.
 */
export default function DistortionsPage() {
  return (
    <Container size="sm" px={0} className={classes.page}>
      <Button
        component={Link}
        to="/clarity"
        variant="subtle"
        color="gray"
        size="compact-sm"
        leftSection={<IconArrowLeft size={16} />}
        mb="md"
      >
        Klarblick
      </Button>

      <Title order={2}>Denkfehler</Title>
      <Text size="sm" c="dimmed" mt={4} mb="lg">
        Muster, in die das Denken unter Anspannung rutscht. Sie sind nicht
        falsch im Sinne von dumm — sie sind Abkürzungen, die in vielen Lagen
        nützlich sind und in manchen in die Irre führen. Zu jedem steht eine
        Frage, mit der sich das prüfen lässt.
      </Text>

      <DistortionList />
    </Container>
  );
}
