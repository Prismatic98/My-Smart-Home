import { Container, SimpleGrid } from '@mantine/core';
import { IconBrain, IconNotebook } from '@tabler/icons-react';

import ModuleCard from '../../components/ModuleCard/ModuleCard.jsx';
import { PAUSE_COLOR } from './lib/appearance.js';

/**
 * Startseite des Moduls: zwei Kacheln, sonst nichts.
 *
 * Bewusst dieselbe Komponente wie die Startseite der App (`ModuleCard`) – wer
 * die App kennt, weiß hier sofort, was zu tun ist, und muss nicht erst eine
 * zweite Art von Übersicht lesen.
 *
 * Kein Einleitungstext, kein Hinweiskasten, keine Zahlen. Was Innehalten ist,
 * steht in der Sitzung und nicht auf einer Kachelseite; und ein Text, der bei
 * jedem Öffnen dasteht, wird nach dem zweiten Mal ohnehin nicht mehr gelesen.
 */
const ACTIONS = [
  {
    key: 'thoughts',
    path: '/pause/thoughts',
    label: 'Gedankenprotokoll',
    icon: IconNotebook,
    color: PAUSE_COLOR,
  },
  {
    // Das Nachschlagewerk steht eine Nuance neben der Modulfarbe: es ist die
    // zweite Kachel und keine zweite Art von Protokoll.
    key: 'distortions',
    path: '/pause/denkfehler',
    label: 'Systematische Denkfehler',
    icon: IconBrain,
    color: 'indigo',
  },
];

export default function PauseHomePage() {
  return (
    <Container size="lg" px={0}>
      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
        {ACTIONS.map((action) => (
          <ModuleCard key={action.key} module={action} />
        ))}
      </SimpleGrid>
    </Container>
  );
}
