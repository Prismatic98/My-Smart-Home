import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Card,
  Container,
  Group,
  Skeleton,
  Stack,
  Text,
  Title,
  Tooltip,
} from '@mantine/core';
import {
  IconArrowLeft,
  IconMoodSad,
  IconMusic,
  IconRefresh,
  IconSparkles,
} from '@tabler/icons-react';

import { useHomeAssistant } from '../../lib/HAProvider.jsx';
import {
  belongsToMusic,
  hasNoneOption,
  isUnavailable,
  noneOptionOf,
} from './capabilities.js';
import { activeEffect, selectLabels, shortLabel } from './deviceModel.js';
import DiagnosticsPanel from './components/DiagnosticsPanel.jsx';
import EffectPicker from './components/EffectPicker.jsx';
import LightControls from './components/LightControls.jsx';
import NumberControl from './components/NumberControl.jsx';
import RateLimitHint from './components/RateLimitHint.jsx';
import SegmentEditor from './components/SegmentEditor.jsx';
import SelectControl from './components/SelectControl.jsx';
import SwitchGroup, { SwitchRow } from './components/SwitchGroup.jsx';
import UnavailableBadge from './components/UnavailableBadge.jsx';
import { useSmartHomeServices } from './services.js';
import { useDevice } from './useDevices.js';

/**
 * Detailansicht eines Geräts.
 *
 * Eigene Route mit der device_id im Pfad, damit die Zurück-Taste des Browsers
 * und Deep-Links funktionieren – dieselbe Entscheidung wie bei der Vorschau in
 * der Dateiablage, wo der Zustand in der URL steht und nicht im React-State.
 *
 * Jeder Abschnitt erscheint nur, wenn das Gerät die Fähigkeit hat. Es gibt keine
 * Verzweigung nach Gerätetyp: was gerendert wird, ergibt sich aus
 * `device.capabilities` und aus dem Vorhandensein der jeweiligen Entitäten.
 */
export default function DeviceDetailPage() {
  const { deviceId } = useParams();
  const { status, devices, registryError } = useHomeAssistant();
  const device = useDevice(deviceId);
  const { selectOption, pressButton } = useSmartHomeServices();

  const [pickerOpen, setPickerOpen] = useState(false);
  const [diagnosticsOpen, setDiagnosticsOpen] = useState(false);

  const loading =
    status === 'connecting' || (devices.size === 0 && !registryError && status !== 'error');

  if (!device) {
    return (
      <Container size="md" px={0}>
        <BackLink />
        {loading ? (
          <Stack gap="md" mt="md">
            <Skeleton height={40} radius="md" />
            <Skeleton height={220} radius="md" />
            <Skeleton height={140} radius="md" />
          </Stack>
        ) : (
          <Alert
            variant="light"
            color="yellow"
            mt="md"
            icon={<IconMoodSad size={18} />}
            title="Gerät nicht gefunden"
          >
            <Text size="sm">
              Zu dieser Adresse gibt es kein Gerät. Vermutlich wurde es in Home Assistant
              entfernt oder umbenannt.
            </Text>
          </Alert>
        )}
      </Container>
    );
  }

  const { capabilities, primary } = device;
  const unavailable = primary ? isUnavailable(primary) : false;
  const effect = activeEffect(device);
  const canStopEffect = hasNoneOption(device.selects.scene);

  // Musik-Regler (Empfindlichkeit) gehören zum Musik-Abschnitt, alle übrigen
  // number-Entitäten in den allgemeinen Block.
  const musicNumbers = device.numbers.filter(belongsToMusic);
  const otherNumbers = device.numbers.filter((entity) => !belongsToMusic(entity));

  const hasEffectSources =
    capabilities.effects || capabilities.hasScenes || capabilities.hasDiy || capabilities.hasSnapshots;

  async function stopEffect() {
    const select = device.selects.scene;
    await selectOption(select, noneOptionOf(select));
  }

  return (
    <Container size="md" px={0}>
      <Stack gap="md">
        <Group justify="space-between" wrap="nowrap" align="flex-start">
          <Group gap="sm" wrap="nowrap" style={{ minWidth: 0 }}>
            <BackLink iconOnly />
            <div style={{ minWidth: 0 }}>
              <Title order={3} lineClamp={1} title={device.name}>
                {device.name}
              </Title>
              <Group gap={6} mt={2}>
                {device.areaName ? (
                  <Badge variant="light" size="sm">
                    {device.areaName}
                  </Badge>
                ) : (
                  <Badge variant="light" color="gray" size="sm">
                    Ohne Bereich
                  </Badge>
                )}
                {unavailable && <UnavailableBadge />}
              </Group>
            </div>
          </Group>
          <RateLimitHint />
        </Group>

        {unavailable && (
          <Alert variant="light" color="gray">
            <Text size="sm">
              Home Assistant erreicht dieses Gerät gerade nicht. Die Bedienelemente bleiben
              sichtbar, damit erkennbar ist, was das Gerät kann – sie sind aber gesperrt.
            </Text>
          </Alert>
        )}

        {primary && (
          <Card withBorder radius="md" padding="md">
            <LightControls entity={primary} />
          </Card>
        )}

        {hasEffectSources && primary && (
          <Card withBorder radius="md" padding="md">
            <Stack gap="sm">
              <Group justify="space-between" wrap="nowrap">
                <Group gap="xs" wrap="nowrap" style={{ minWidth: 0 }}>
                  <IconSparkles size={18} />
                  <Text fw={600}>Effekt</Text>
                </Group>
                <Group gap={6} wrap="nowrap">
                  <Button
                    size="compact-sm"
                    variant="light"
                    disabled={unavailable}
                    onClick={() => setPickerOpen(true)}
                  >
                    {effect ? 'Ändern' : 'Wählen'}
                  </Button>
                  {canStopEffect && (
                    <Button
                      size="compact-sm"
                      variant="subtle"
                      color="gray"
                      disabled={unavailable}
                      onClick={stopEffect}
                    >
                      Effekt beenden
                    </Button>
                  )}
                </Group>
              </Group>

              {effect ? (
                <Group gap="xs">
                  <Badge variant="light" color="grape" size="lg">
                    {effect.name}
                  </Badge>
                  <Text size="xs" c="dimmed">
                    {effect.source === 'diy' ? 'DIY-Szene' : 'Szene'}
                  </Text>
                </Group>
              ) : (
                <Text size="sm" c="dimmed">
                  Kein Effekt aktiv.
                </Text>
              )}

              {/* Snapshots sind einmalige Aktionen, kein Zustand – sie stehen
                  deshalb nur als Auswahlquelle im Picker, nicht als „aktiv". */}
              {capabilities.hasSnapshots && (
                <Text size="xs" c="dimmed">
                  Snapshots stehen im Auswahldialog unter „{selectLabels.snapshot}".
                </Text>
              )}
            </Stack>
          </Card>
        )}

        {device.switches.length > 0 && (
          <Card withBorder radius="md" padding="md">
            <SwitchGroup device={device} entities={device.switches} title="Zonen und Modi" />
          </Card>
        )}

        {capabilities.hasMusic && (
          <Card withBorder radius="md" padding="md">
            <Stack gap="sm">
              <Group gap="xs">
                <IconMusic size={18} />
                <Text fw={600}>Musikmodus</Text>
              </Group>

              {/* Switch und Select sind unabhängig: es gibt Geräte mit Schalter
                  ohne Modus-Auswahl. Jeder Teil wird für sich gerendert. */}
              {device.music.switch && (
                <SwitchRow entity={device.music.switch} deviceName={device.name} />
              )}
              {device.music.select && (
                <SelectControl
                  entity={device.music.select}
                  deviceName={device.name}
                  label="Modus"
                />
              )}
              {musicNumbers.map((entity) => (
                <NumberControl key={entity.entity_id} entity={entity} deviceName={device.name} />
              ))}
            </Stack>
          </Card>
        )}

        {capabilities.hasSegments && (
          <Card withBorder radius="md" padding="md">
            <SegmentEditor device={device} />
          </Card>
        )}

        {(device.otherSelects.length > 0 || otherNumbers.length > 0) && (
          <Card withBorder radius="md" padding="md">
            <Stack gap="sm">
              <Text fw={600}>Weitere Einstellungen</Text>
              {device.otherSelects.map((entity) => (
                <SelectControl key={entity.entity_id} entity={entity} deviceName={device.name} />
              ))}
              {otherNumbers.map((entity) => (
                <NumberControl key={entity.entity_id} entity={entity} deviceName={device.name} />
              ))}
            </Stack>
          </Card>
        )}

        {device.extraLights.length > 0 && (
          <Card withBorder radius="md" padding="md">
            <Stack gap="sm">
              <Text fw={600}>Weitere Lampen dieses Geräts</Text>
              {device.extraLights.map((entity) => (
                <LightControls
                  key={entity.entity_id}
                  entity={entity}
                  label={shortLabel(entity, device.name)}
                />
              ))}
            </Stack>
          </Card>
        )}

        {device.buttons.length > 0 && (
          <Group gap="xs">
            {device.buttons.map((entity) => (
              <Button
                key={entity.entity_id}
                size="compact-sm"
                variant="default"
                leftSection={<IconRefresh size={14} />}
                onClick={() => pressButton(entity)}
              >
                {entity.attributes?.friendly_name?.replace(`${device.name} `, '') ?? 'Ausführen'}
              </Button>
            ))}
          </Group>
        )}

        <DiagnosticsPanel
          device={device}
          expanded={diagnosticsOpen}
          onToggle={() => setDiagnosticsOpen((value) => !value)}
        />
      </Stack>

      {pickerOpen && (
        <EffectPicker device={device} opened={pickerOpen} onClose={() => setPickerOpen(false)} />
      )}
    </Container>
  );
}

/** Zurück zur Übersicht. Als Link, damit ein Deep-Link ebenfalls dorthin führt. */
function BackLink({ iconOnly = false }) {
  if (iconOnly) {
    return (
      <Tooltip label="Zurück zur Übersicht" withArrow>
        <ActionIcon
          component={Link}
          to="/smart-home"
          variant="subtle"
          size="lg"
          aria-label="Zurück zur Übersicht"
        >
          <IconArrowLeft size={20} />
        </ActionIcon>
      </Tooltip>
    );
  }

  return (
    <Button
      component={Link}
      to="/smart-home"
      variant="subtle"
      size="compact-sm"
      leftSection={<IconArrowLeft size={14} />}
    >
      Übersicht
    </Button>
  );
}
