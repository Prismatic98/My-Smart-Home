import { Badge, Tooltip } from '@mantine/core';
import { IconSpeedboat } from '@tabler/icons-react';

import { useRateLimit } from '../useDevices.js';

/**
 * Hinweis auf das Rest-Kontingent der Hersteller-Cloud.
 *
 * Bewusst kein Dauerelement: Lesen kostet nichts (alle Zustände kommen über den
 * WebSocket-Push), das Kontingent ist also im Normalbetrieb kein Thema. Erst
 * wenn es knapp wird – etwa nachdem jemand mehrfach 15 Segmente gefärbt hat –
 * ist die Zahl eine Erklärung dafür, dass Befehle plötzlich ins Leere laufen.
 *
 * Welche Sensoren gemeint sind, entscheidet ein Suffix-Muster im Geräte-Modell,
 * keine feste entity_id.
 */

/** Unter diesem Wert wird der Hinweis eingeblendet. */
const WARN_BELOW = 20;

export default function RateLimitHint() {
  const rateLimit = useRateLimit();

  if (!rateLimit || rateLimit.remaining >= WARN_BELOW) return null;

  const critical = rateLimit.remaining <= 5;

  return (
    <Tooltip
      label={`Die Hersteller-Cloud erlaubt ${
        rateLimit.total ?? 100
      } Anfragen pro Minute. Jede Aktion zählt, Zustände lesen nicht. Kurz warten, dann füllt sich das Kontingent wieder.`}
      multiline
      w={280}
      withArrow
    >
      <Badge
        variant="light"
        color={critical ? 'red' : 'orange'}
        leftSection={<IconSpeedboat size={12} />}
      >
        {rateLimit.remaining} Anfragen übrig
      </Badge>
    </Tooltip>
  );
}
