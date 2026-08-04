import { Link } from 'react-router-dom';
import { Badge, Button, Card, Group, Stack, Text, ThemeIcon, Tooltip } from '@mantine/core';
import { IconBulb, IconBulbOff, IconChevronRight } from '@tabler/icons-react';

import { colorHex, isOn } from '../capabilities.js';
import { activeEffect, describeState, isReachable, unreachableReason } from '../deviceModel.js';
import EffectSwatch from './EffectSwatch.jsx';
import { BrightnessSlider, PowerSwitch } from './LightControls.jsx';
import UnavailableBadge from './UnavailableBadge.jsx';
import classes from '../SmartHome.module.scss';

/**
 * Eine Karte pro Gerät – nicht pro Entität.
 *
 * Bewusst knapp: an/aus, Helligkeit, aktiver Effekt. Segmente, Selects und
 * Zonen-Switches gehören in die Detailansicht. Auf der Übersicht würden 15
 * Segmentfelder pro Karte jede Orientierung zerstören.
 *
 * Der Weg in die Detailansicht ist ein eigener Knopf und nicht die ganze Karte:
 * in der Karte stecken Schalter und Regler, und ein Klick darf nicht zweierlei
 * bedeuten (dieselbe Regel wie in der Dateiablage).
 */
export default function DeviceCard({ device }) {
  const { primary, capabilities } = device;
  // „Nicht erreichbar" umfasst beides: die Entität ist weg, oder das Gerät
  // antwortet nicht mehr und die Cloud wiederholt nur den letzten Stand.
  const reachable = primary ? isReachable(device) : false;
  const on = primary ? isOn(primary) && reachable : false;
  const effect = activeEffect(device);

  // Die Karte leuchtet in der Farbe, die die Lampe gerade zeigt. Bei
  // Farbtemperatur-Weiß oder laufendem Effekt gibt es kein rgb_color – dann
  // bleibt es beim gelben Standardton aus dem Stylesheet.
  const accent = on ? colorHex(primary) : null;

  return (
    <Card
      withBorder
      radius="md"
      padding="md"
      className={classes.deviceCard}
      data-on={on || undefined}
      data-unavailable={!reachable || undefined}
      style={accent ? { '--device-color': accent } : undefined}
    >
      <Stack gap="sm" className={classes.cardBody}>
        <Group justify="space-between" wrap="nowrap" align="flex-start">
          <Group gap="sm" wrap="nowrap" className={classes.clamp}>
            {/* Das Symbol bleibt farblich immer gleich: die Lichtfarbe steht
                schon im Rahmen der Kachel. Zwei Träger derselben Information
                machen die Übersicht nur unruhig – der Wechsel zwischen Birne
                und durchgestrichener Birne sagt an/aus deutlich genug. */}
            <ThemeIcon variant="light" color="gray" size="lg" radius="md">
              {on ? <IconBulb size={20} /> : <IconBulbOff size={20} />}
            </ThemeIcon>

            <div className={classes.clamp}>
              <Text fw={600} lineClamp={1} title={device.name}>
                {device.name}
              </Text>
              <Text size="xs" c="dimmed" lineClamp={1}>
                {describeState(device) ?? 'kein Licht'}
              </Text>
            </div>
          </Group>

          {reachable ? (
            primary && <PowerSwitch entity={primary} />
          ) : (
            <UnavailableBadge reason={unreachableReason(device)} />
          )}
        </Group>

        {primary && capabilities.brightness && reachable && <BrightnessSlider entity={primary} />}

        <Group justify="space-between" wrap="nowrap" gap="xs" className={classes.cardFooter}>
          {effect ? (
            <Tooltip
              label={effect.source === 'diy' ? 'DIY-Szene' : 'Szene'}
              withArrow
              openDelay={400}
            >
              <Badge
                variant="light"
                color="grape"
                size="sm"
                leftSection={<EffectSwatch name={effect.name} size="xs" />}
                style={{ minWidth: 0 }}
              >
                {effect.name}
              </Badge>
            </Tooltip>
          ) : (
            <span />
          )}

          <Button
            component={Link}
            to={`/smart-home/${device.id}`}
            variant="subtle"
            size="compact-sm"
            rightSection={<IconChevronRight size={14} />}
          >
            Details
          </Button>
        </Group>
      </Stack>
    </Card>
  );
}
