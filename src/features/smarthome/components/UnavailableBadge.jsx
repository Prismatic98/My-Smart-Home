import { Badge, Tooltip } from '@mantine/core';
import { IconPlugConnectedX } from '@tabler/icons-react';

/**
 * Markiert eine Entität, die Home Assistant kennt, aber nicht erreicht.
 *
 * Die zugehörigen Bedienelemente werden gesperrt und nicht versteckt: wer die
 * Karte kennt, soll sehen, dass die Funktion existiert und nur gerade nicht
 * geht. Verschwindende Knöpfe sehen wie ein Fehler der App aus.
 */
export default function UnavailableBadge({ label = 'offline', reason }) {
  const badge = (
    <Badge
      color="gray"
      variant="light"
      size="sm"
      leftSection={<IconPlugConnectedX size={12} />}
      style={{ flex: '0 0 auto' }}
    >
      {label}
    </Badge>
  );

  if (!reason) return badge;

  return (
    <Tooltip label={reason} multiline w={240} withArrow>
      {badge}
    </Tooltip>
  );
}
