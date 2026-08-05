import { Container, SimpleGrid } from '@mantine/core';
import { IconBrain, IconNotebook } from '@tabler/icons-react';

import ModuleCard from '../../components/ModuleCard/ModuleCard.jsx';
import { CLARITY_COLOR } from './lib/appearance.js';

/**
 * Startseite des Moduls: zwei Kacheln, sonst nichts.
 *
 * Bewusst dieselbe Komponente wie die Startseite der App (`ModuleCard`) – wer
 * die App kennt, weiß hier sofort, was zu tun ist, und muss nicht erst eine
 * zweite Art von Übersicht lesen.
 *
 * Kein Einleitungstext, kein Hinweiskasten, keine Zahlen. Was Klarblick ist,
 * steht in der Sitzung und nicht auf einer Kachelseite; und ein Text, der bei
 * jedem Öffnen dasteht, wird nach dem zweiten Mal ohnehin nicht mehr gelesen.
 */
const ACTIONS = [
  {
    key: 'thoughts',
    path: '/clarity/thoughts',
    label: 'Gedankenprotokoll',
    icon: IconNotebook,
    color: CLARITY_COLOR,
  },
  {
    // Das Nachschlagewerk steht eine Nuance neben der Modulfarbe: es ist die
    // zweite Kachel und keine zweite Art von Protokoll.
    key: 'distortions',
    path: '/clarity/denkfehler',
    label: 'Systematische Denkfehler',
    icon: IconBrain,
    color: 'indigo',
  },
];

export default function ClarityHomePage() {
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
