import { useCallback, useEffect, useMemo, useRef } from 'react';
import { notifications } from '@mantine/notifications';

import { entityName } from '../../lib/haEntity.js';
import { useHomeAssistant } from '../../lib/HAProvider.jsx';
import { hexToRgb } from './capabilities.js';

/**
 * Alle Schreibzugriffe auf Home Assistant an einer Stelle – inklusive
 * Drosselung und Fehlermeldung.
 *
 * Warum gedrosselt: Lesen ist kostenlos, weil alle Zustände über den
 * WebSocket gepusht werden. Jede AKTION kostet aber eine Anfrage im Kontingent
 * der Govee-Cloud (100 pro Minute). Ein gezogener Helligkeitsregler feuert ohne
 * Drosselung pro Pixel einen Aufruf ab und hätte das Kontingent in wenigen
 * Sekunden verbraucht.
 *
 * Zwei Wege, deshalb zwei Methoden pro geregeltem Wert:
 *  - während des Ziehens: `send` (trailing, max. ein Aufruf pro Fenster)
 *  - beim Loslassen:      `flush` (sofort, verwirft einen wartenden Aufruf)
 *
 * Jede Funktion gibt `true` bei Erfolg und `false` bei Fehlschlag zurück,
 * statt zu werfen. Die Komponenten brauchen das Ergebnis nur, um ihren
 * optimistischen Wert zurückzurollen – ein try/catch an jeder Bedienstelle
 * wäre reine Umständlichkeit.
 */

/** Drosselfenster für Regler (Helligkeit, Farbe, Farbtemperatur). */
export const THROTTLE_MS = 400;

/**
 * Abstand zwischen zwei Segment-Aufrufen. Eine Lichterkette mit 15 Segmenten
 * kostet 15 Anfragen; ohne Abstand schlagen die als Salve auf und die
 * Integration antwortet unzuverlässig.
 */
export const SEGMENT_GAP_MS = 150;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Trailing-Throttle je Schlüssel. Der Schlüssel ist normalerweise
 * `<entity_id>:<eigenschaft>`, damit Helligkeit und Farbe derselben Lampe sich
 * nicht gegenseitig verdrängen.
 */
function useThrottle(delay) {
  const timers = useRef(new Map());
  const lastRun = useRef(new Map());

  useEffect(
    () => () => {
      timers.current.forEach((timer) => clearTimeout(timer.id));
      timers.current.clear();
    },
    []
  );

  /** Führt spätestens nach `delay` aus – und nur den jeweils letzten Wunsch. */
  const send = useCallback(
    (key, execute) => {
      const now = Date.now();
      const since = now - (lastRun.current.get(key) ?? 0);

      const existing = timers.current.get(key);
      if (existing) {
        // Es wartet schon ein Aufruf: nur den Inhalt austauschen.
        existing.execute = execute;
        return;
      }

      if (since >= delay) {
        lastRun.current.set(key, now);
        execute();
        return;
      }

      const entry = { execute, id: null };
      entry.id = setTimeout(() => {
        timers.current.delete(key);
        lastRun.current.set(key, Date.now());
        entry.execute();
      }, delay - since);
      timers.current.set(key, entry);
    },
    [delay]
  );

  /** Sofort ausführen und einen wartenden Aufruf verwerfen (Regler loslassen). */
  const flush = useCallback((key, execute) => {
    const existing = timers.current.get(key);
    if (existing) {
      clearTimeout(existing.id);
      timers.current.delete(key);
    }
    lastRun.current.set(key, Date.now());
    return execute();
  }, []);

  return { send, flush };
}

export function useSmartHomeServices() {
  const { callService } = useHomeAssistant();
  const { send, flush } = useThrottle(THROTTLE_MS);

  /**
   * Führt einen Service-Aufruf aus und meldet Fehler im Klartext.
   * `subject` ist der Name, der in der Meldung auftaucht.
   */
  const run = useCallback(
    async (domain, service, data, subject) => {
      try {
        await callService(domain, service, data);
        return true;
      } catch (cause) {
        notifications.show({
          color: 'red',
          title: subject ? `${subject} reagiert nicht` : 'Aktion fehlgeschlagen',
          message: cause.message,
          autoClose: 6000,
        });
        return false;
      }
    },
    [callService]
  );

  return useMemo(() => {
    /** Aufruf auf einer Lichtentität, mit deren Namen in der Fehlermeldung. */
    const light = (entity, service, data) =>
      run('light', service, { entity_id: entity.entity_id, ...data }, entityName(entity));

    /**
     * Gedrosselte Variante. `immediate` steht für „der Nutzer hat den Regler
     * losgelassen" und schickt sofort.
     */
    const throttledLight = (entity, property, data, immediate) => {
      const key = `${entity.entity_id}:${property}`;
      const execute = () => light(entity, 'turn_on', data);
      if (immediate) return flush(key, execute);
      send(key, execute);
      return Promise.resolve(true);
    };

    return {
      /* ---------- Licht: an/aus ---------- */

      setPower: (entity, on) => light(entity, on ? 'turn_on' : 'turn_off'),

      /* ---------- Licht: Regler ---------- */

      /** 0 % bedeutet ausschalten – eine Lampe mit Helligkeit 0 gibt es nicht. */
      setBrightness: (entity, pct, immediate = false) =>
        pct <= 0
          ? flush(`${entity.entity_id}:brightness`, () => light(entity, 'turn_off'))
          : throttledLight(entity, 'brightness', { brightness_pct: pct }, immediate),

      setColorHex: (entity, hex, immediate = false) => {
        const rgb = hexToRgb(hex);
        if (!rgb) return Promise.resolve(false);
        return throttledLight(entity, 'color', { rgb_color: rgb }, immediate);
      },

      setColorTemp: (entity, kelvin, immediate = false) =>
        throttledLight(entity, 'colorTemp', { color_temp_kelvin: kelvin }, immediate),

      /* ---------- Effekte ---------- */

      /**
       * Szene aus `effect_list`. Bewusst über `light.turn_on` statt über das
       * Scene-Select: das schaltet die Lampe gleichzeitig ein, und der aktive
       * Effekt ist danach im Attribut `effect` ablesbar.
       */
      setEffect: (entity, effect) => light(entity, 'turn_on', { effect }),

      /* ---------- Selects (DIY, Snapshot, Musikmodus, unbekannte) ---------- */

      selectOption: (entity, option) =>
        run(
          'select',
          'select_option',
          { entity_id: entity.entity_id, option },
          entityName(entity)
        ),

      /* ---------- Switches, Zahlen, Knöpfe ---------- */

      setSwitch: (entity, on) =>
        run(
          'switch',
          on ? 'turn_on' : 'turn_off',
          { entity_id: entity.entity_id },
          entityName(entity)
        ),

      setNumber: (entity, value, immediate = false) => {
        const key = `${entity.entity_id}:number`;
        const execute = () =>
          run('number', 'set_value', { entity_id: entity.entity_id, value }, entityName(entity));
        if (immediate) return flush(key, execute);
        send(key, execute);
        return Promise.resolve(true);
      },

      pressButton: (entity) =>
        run('button', 'press', { entity_id: entity.entity_id }, entityName(entity)),

      /* ---------- Segmente ---------- */

      /**
       * Ein einzelnes Segment. Ungedrosselt, weil der Segment-Farbwähler erst
       * beim Bestätigen sendet und nicht während des Ziehens.
       */
      setSegmentColor: (entity, hex) => {
        const rgb = hexToRgb(hex);
        if (!rgb) return Promise.resolve(false);
        return light(entity, 'turn_on', { rgb_color: rgb });
      },

      /**
       * Mehrere Segmente hintereinander. Bewusst sequenziell mit Abstand statt
       * als Schleife aus 15 gleichzeitigen Aufrufen: die Cloud-API quittiert
       * eine Salve unzuverlässig, und der Fortschritt soll sichtbar sein.
       *
       * Bricht beim ersten Fehler ab – 14 weitere Fehlermeldungen hintereinander
       * helfen niemandem. `onProgress(erledigt, gesamt)` treibt die Anzeige.
       */
      applySegmentColors: async (entries, { onProgress, isCancelled } = {}) => {
        for (let index = 0; index < entries.length; index += 1) {
          if (isCancelled?.()) return false;

          const { entity, hex } = entries[index];
          const rgb = hexToRgb(hex);
          if (!rgb) continue;

          const ok = await light(entity, 'turn_on', { rgb_color: rgb });
          if (!ok) return false;

          onProgress?.(index + 1, entries.length);
          if (index < entries.length - 1) await sleep(SEGMENT_GAP_MS);
        }
        return true;
      },

      /**
       * Alle Geräte eines Bereichs schalten. Ebenfalls sequenziell – bei „alles
       * aus" im Wohnzimmer sind das fünf Aufrufe.
       */
      setPowerForAll: async (lights, on, { onProgress } = {}) => {
        let failed = 0;
        for (let index = 0; index < lights.length; index += 1) {
          const ok = await light(lights[index], on ? 'turn_on' : 'turn_off');
          if (!ok) failed += 1;
          onProgress?.(index + 1, lights.length);
          if (index < lights.length - 1) await sleep(SEGMENT_GAP_MS);
        }
        return failed === 0;
      },
    };
  }, [run, send, flush]);
}
