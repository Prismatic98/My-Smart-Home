import { Container, Group, Text, ThemeIcon, Title } from '@mantine/core';
import { IconBrain } from '@tabler/icons-react';

import DistortionList from './components/DistortionList.jsx';
import { PAUSE_COLOR } from './lib/appearance.js';
import classes from './Pause.module.scss';

/**
 * Der Denkfehler-Katalog als Nachschlagewerk.
 *
 * Eigene Seite, weil man ihn auch ohne offenes Protokoll lesen will – etwa
 * dann, wenn in der Sitzung ein Name gefallen ist. Es gibt hier nichts
 * auszuwählen und nichts zu speichern.
 *
 * Die Beschreibungen sind eigenständig formuliert und stammen nicht aus
 * fremden Arbeitsblättern; die Herleitung steht in
 * docs/pause-fachliche-grundlagen.md und bewusst nicht hier.
 */
export default function DistortionsPage() {
  return (
    <Container size="sm" px={0} className={classes.page}>
      {/* Das Zeichen ist dasselbe wie auf der Kachel, die hierher führt – und
          es bringt die Modulfarbe schon in die Kopfzeile, damit die Seite
          nicht als graue Textwüste beginnt. */}
      <Group gap="sm" align="center" wrap="nowrap">
        <ThemeIcon size={36} radius="md" variant="light" color={PAUSE_COLOR}>
          <IconBrain size={22} />
        </ThemeIcon>
        <Title order={2} className={classes.title}>
          Systematische Denkfehler
        </Title>
      </Group>

      <Text size="sm" c="dimmed" mt="sm" mb="lg" className={classes.intro}>
        Muster, in die das Denken unter Anspannung rutscht. Sie sind nicht
        falsch im Sinne von dumm — sie sind Abkürzungen, die in vielen Lagen
        nützlich sind und in manchen in die Irre führen. Zu jedem steht eine
        Frage, mit der sich das prüfen lässt.
      </Text>

      <DistortionList />
    </Container>
  );
}
