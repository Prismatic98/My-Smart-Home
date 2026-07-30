import { Link } from 'react-router-dom';
import { Badge, Button, Card, Group, Stack, Text, ThemeIcon, Tooltip } from '@mantine/core';
import { IconBulb, IconBulbOff, IconChevronRight, IconSparkles } from '@tabler/icons-react';

import { colorHex, isOn, isUnavailable } from '../capabilities.js';
import { activeEffect, describeState } from '../deviceModel.js';
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
  const unavailable = primary ? isUnavailable(primary) : true;
  const on = primary ? isOn(primary) && !unavailable : false;
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
      data-unavailable={unavailable || undefined}
      style={accent ? { '--device-color': accent } : undefined}
    >
      <Stack gap="sm" className={classes.cardBody}>
        <Group justify="space-between" wrap="nowrap" align="flex-start">
          <Group gap="sm" wrap="nowrap" className={classes.clamp}>
            <ThemeIcon
              variant="light"
              color={on ? 'yellow' : 'gray'}
              size="lg"
              radius="md"
              style={accent ? { color: accent } : undefined}
            >
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

          {unavailable ? (
            <UnavailableBadge reason="Home Assistant erreicht dieses Gerät gerade nicht. Die Bedienelemente bleiben sichtbar, sind aber gesperrt." />
          ) : (
            primary && <PowerSwitch entity={primary} />
          )}
        </Group>

        {primary && capabilities.brightness && !unavailable && (
          <BrightnessSlider entity={primary} />
        )}

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
                leftSection={<IconSparkles size={11} />}
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
