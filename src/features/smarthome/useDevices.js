import { useMemo } from 'react';

import { useHomeAssistant } from '../../lib/HAProvider.jsx';
import { buildDevices, findRateLimitSensors, groupByArea } from './deviceModel.js';

/**
 * Die React-Anbindung an das Geräte-Modell.
 *
 * Getrennt von deviceModel.js, weil dort die reine Logik liegt (und deshalb
 * ohne Browser prüfbar bleibt). Hier passiert nur zwei Dinge: den Live-Zustand
 * aus dem HAProvider holen und das Ergebnis memoisieren.
 *
 * Kein TanStack Query: die Daten werden nicht abgefragt, sondern über den
 * WebSocket gepusht – siehe HAProvider.
 */

/** Das Geräte-Modell, neu berechnet wenn Zustände oder Registries wechseln. */
export function useDevices() {
  const { entities, devices, entityRegistry, areas } = useHomeAssistant();

  return useMemo(
    () => buildDevices({ entities, devices, entityRegistry, areas }),
    [entities, devices, entityRegistry, areas]
  );
}

/** Ein einzelnes Gerät für die Detailansicht; null, solange es nicht existiert. */
export function useDevice(deviceId) {
  const devices = useDevices();

  return useMemo(
    () => devices.find((device) => device.id === deviceId) ?? null,
    [devices, deviceId]
  );
}

/** Bereiche mit ihren Geräten, für die Übersicht. */
export function useDevicesByArea() {
  const devices = useDevices();
  const { areas } = useHomeAssistant();

  return useMemo(() => groupByArea(devices, areas), [devices, areas]);
}

/**
 * Niedrigster Rest-Wert aller Rate-Limit-Sensoren, oder null wenn es keinen
 * gibt. Der Hinweis in der UI hängt an diesem Wert – siehe RateLimitHint.
 */
export function useRateLimit() {
  const { entities } = useHomeAssistant();

  return useMemo(() => {
    const sensors = findRateLimitSensors(entities);
    if (sensors.length === 0) return null;

    let lowest = null;
    for (const sensor of sensors) {
      const value = Number(sensor.state);
      if (!Number.isFinite(value)) continue;
      if (lowest === null || value < lowest.remaining) {
        lowest = {
          remaining: value,
          total: sensor.attributes?.total_limit ?? null,
          entityId: sensor.entity_id,
        };
      }
    }
    return lowest;
  }, [entities]);
}
