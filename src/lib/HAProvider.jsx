import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  ERR_HASS_HOST_REQUIRED,
  callService as haCallService,
  subscribeEntities,
} from 'home-assistant-js-websocket';

import { connectToHa, describeHaError, isHaConfigured } from './homeassistant.js';

/**
 * Hält genau eine Home-Assistant-Verbindung für die ganze App und stellt den
 * Live-Zustand aller Entitäten bereit.
 *
 * Bewusst ohne TanStack Query: die Zustände werden nicht abgefragt, sondern
 * von Home Assistant über den WebSocket gepusht. Ein Cache mit Invalidierung
 * wäre hier die falsche Abstraktion – subscribeEntities ist bereits die
 * Quelle der Wahrheit und liefert nach jedem Zustandswechsel den neuen Stand.
 *
 * Zusätzlich zu den Zuständen laden wir die drei Registries (Geräte, Entitäten,
 * Bereiche). Sie sind nötig, weil Entitäten allein keine Struktur haben: erst
 * die Entity-Registry sagt, welche Entität zu welchem Gerät und Bereich gehört
 * und welche davon nur Diagnose ist. Ohne das würde die Smart-Home-Seite über
 * 60 Lichtentitäten als 60 Kacheln zeigen, obwohl es acht Geräte sind.
 *
 * Registries werden nicht gepollt: sie ändern sich nur beim Umbenennen,
 * Zuordnen oder Neuanlegen, und genau dann feuert Home Assistant ein
 * `*_registry_updated`-Event.
 *
 * Watchdog: home-assistant-js-websocket verbindet nur dann neu, wenn der
 * Socket ein 'close'-Event feuert. Friert der Browser den Tab ein (Handy im
 * Standby, PWA im Hintergrund) oder wechselt das Netz, stirbt die Verbindung
 * oft still – ohne 'close'. Die App hielte sie dann für lebendig und würde
 * schlicht keine Updates mehr bekommen. Deshalb prüfen wir aktiv per ping():
 * regelmäßig, beim Zurückkehren zur App und bei Netzrückkehr.
 */

const HAContext = createContext(null);

/** Abstand zwischen zwei Lebenszeichen-Prüfungen. */
const HEARTBEAT_INTERVAL = 20_000;

/** So lange darf ein ping() maximal brauchen, bevor die Verbindung als tot gilt. */
const PING_TIMEOUT = 5_000;

/**
 * Ein Reload einer Registry wird um diese Zeit verzögert. Wird eine Integration
 * neu geladen, feuert Home Assistant ein Event pro Entität – ohne Sammelfenster
 * würden daraus dutzende identische list-Aufrufe.
 */
const REGISTRY_RELOAD_DELAY = 300;

/**
 * Die drei Registries: WebSocket-Kommando, Schlüssel im Ergebnis-Objekt und das
 * Event, das eine Änderung ankündigt. Als Tabelle, damit Laden und Neuladen
 * denselben Weg gehen.
 */
const REGISTRIES = [
  {
    key: 'devices',
    command: 'config/device_registry/list',
    event: 'device_registry_updated',
    // Geräte werden über ihre device_id nachgeschlagen.
    idOf: (entry) => entry.id,
  },
  {
    key: 'entityRegistry',
    command: 'config/entity_registry/list',
    event: 'entity_registry_updated',
    idOf: (entry) => entry.entity_id,
  },
  {
    key: 'areas',
    command: 'config/area_registry/list',
    event: 'area_registry_updated',
    idOf: (entry) => entry.area_id,
  },
];

const EMPTY_MAP = new Map();

/** Startwert: leere Maps, damit Verbraucher nie auf undefined stoßen. */
const emptyRegistries = { devices: EMPTY_MAP, entityRegistry: EMPTY_MAP, areas: EMPTY_MAP };

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('ping timeout')), ms)),
  ]);
}

/** 'unconfigured' | 'connecting' | 'connected' | 'disconnected' | 'error' */
const initialStatus = isHaConfigured ? 'connecting' : 'unconfigured';
const initialError = isHaConfigured ? null : describeHaError(ERR_HASS_HOST_REQUIRED);

export function HAProvider({ children }) {
  const [status, setStatus] = useState(initialStatus);
  const [error, setError] = useState(initialError);
  const [entities, setEntities] = useState({});
  const [registries, setRegistries] = useState(emptyRegistries);
  const [registryError, setRegistryError] = useState(null);
  const [attempt, setAttempt] = useState(0);

  const connectionRef = useRef(null);

  useEffect(() => {
    if (!isHaConfigured) {
      setStatus('unconfigured');
      return undefined;
    }

    let cancelled = false;
    let unsubscribeEntities;
    const unsubscribeEvents = [];
    let connection;
    let heartbeat;
    const reloadTimers = new Map();

    /**
     * Lädt eine Registry und legt sie als Map ab. Fehler landen in
     * `registryError`: ohne die Registries lässt sich kein Geräte-Modell
     * bauen, und der häufigste Grund ist ein Token ohne Administratorrechte –
     * das muss die Seite sagen können, statt leer zu bleiben.
     */
    const loadRegistry = async (registry) => {
      const conn = connectionRef.current;
      if (!conn || cancelled) return;

      try {
        const list = await conn.sendMessagePromise({ type: registry.command });
        if (cancelled) return;
        const map = new Map(list.map((entry) => [registry.idOf(entry), entry]));
        setRegistries((current) => ({ ...current, [registry.key]: map }));
        setRegistryError(null);
      } catch (cause) {
        if (!cancelled) setRegistryError(describeHaError(cause));
      }
    };

    const loadAllRegistries = () => REGISTRIES.forEach((registry) => loadRegistry(registry));

    /** Sammelt Event-Salven eines Registry-Typs zu einem Reload zusammen. */
    const scheduleReload = (registry) => {
      clearTimeout(reloadTimers.get(registry.key));
      reloadTimers.set(
        registry.key,
        setTimeout(() => loadRegistry(registry), REGISTRY_RELOAD_DELAY)
      );
    };

    const handleReady = () => {
      if (cancelled) return;
      setStatus('connected');
      setError(null);
      // Nach einem Reconnect abonniert die Bibliothek die Zustände selbst neu.
      // Die Registries sind aber ein einmaliger Aufruf – während der Trennung
      // können sie sich geändert haben, also hier erneut holen.
      loadAllRegistries();
    };
    const handleDisconnected = () => {
      // Die Bibliothek versucht selbstständig, neu zu verbinden.
      if (!cancelled) setStatus('disconnected');
    };
    const handleReconnectError = (_conn, err) => {
      if (!cancelled) {
        setStatus('error');
        setError(describeHaError(err));
      }
    };

    /**
     * Prüft, ob die Verbindung wirklich noch antwortet, und erzwingt sonst
     * einen Neuaufbau. `reconnect(true)` verwirft den alten Socket, statt auf
     * dessen (womöglich nie eintreffendes) close-Event zu warten.
     */
    const checkAlive = async () => {
      const conn = connectionRef.current;
      if (!conn || cancelled) return;

      if (!conn.connected) {
        conn.reconnect(true);
        return;
      }

      try {
        await withTimeout(conn.ping(), PING_TIMEOUT);
      } catch {
        if (!cancelled && connectionRef.current === conn) {
          setStatus('disconnected');
          conn.reconnect(true);
        }
      }
    };

    const handleVisibility = () => {
      // Wichtigster Fall: die PWA kommt aus dem Hintergrund zurück.
      if (document.visibilityState === 'visible') checkAlive();
    };

    setStatus('connecting');
    setError(null);

    connectToHa()
      .then(async (conn) => {
        if (cancelled) {
          conn.close();
          return;
        }

        connection = conn;
        connectionRef.current = conn;

        conn.addEventListener('ready', handleReady);
        conn.addEventListener('disconnected', handleDisconnected);
        conn.addEventListener('reconnect-error', handleReconnectError);

        // Liefert beim Abonnieren einmal alle Entitäten und danach jede Änderung.
        // Nach einem Reconnect abonniert die Bibliothek selbstständig neu und
        // Home Assistant schickt dabei wieder den vollständigen Zustand.
        unsubscribeEntities = subscribeEntities(conn, (updated) => {
          if (!cancelled) setEntities(updated);
        });

        loadAllRegistries();

        // Änderungen an den Registries kommen als Event, nicht per Polling.
        // subscribeEvents richtet sich nach einem Reconnect selbst wieder ein.
        for (const registry of REGISTRIES) {
          const unsubscribe = await conn.subscribeEvents(
            () => scheduleReload(registry),
            registry.event
          );
          if (cancelled) {
            unsubscribe();
            return;
          }
          unsubscribeEvents.push(unsubscribe);
        }

        setStatus('connected');

        heartbeat = setInterval(checkAlive, HEARTBEAT_INTERVAL);
        document.addEventListener('visibilitychange', handleVisibility);
        window.addEventListener('online', checkAlive);
      })
      .catch((cause) => {
        if (cancelled) return;
        setStatus('error');
        setError(describeHaError(cause));
      });

    return () => {
      cancelled = true;
      clearInterval(heartbeat);
      reloadTimers.forEach((timer) => clearTimeout(timer));
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('online', checkAlive);
      unsubscribeEntities?.();
      unsubscribeEvents.forEach((unsubscribe) => unsubscribe());
      if (connection) {
        connection.removeEventListener('ready', handleReady);
        connection.removeEventListener('disconnected', handleDisconnected);
        connection.removeEventListener('reconnect-error', handleReconnectError);
        connection.close();
      }
      connectionRef.current = null;
    };
  }, [attempt]);

  /**
   * Ruft einen Home-Assistant-Service auf (z. B. light.turn_on).
   * Wirft mit verständlichem Text, wenn keine Verbindung besteht.
   */
  const callService = useCallback(async (domain, service, serviceData, target) => {
    const connection = connectionRef.current;
    if (!connection) {
      throw new Error('Keine Verbindung zu Home Assistant.');
    }
    try {
      return await haCallService(connection, domain, service, serviceData, target);
    } catch (cause) {
      throw new Error(describeHaError(cause));
    }
  }, []);

  /** Erzwingt einen neuen Verbindungsversuch (Button in der Fehleranzeige). */
  const reconnect = useCallback(() => setAttempt((value) => value + 1), []);

  const value = useMemo(
    () => ({
      status,
      error,
      entities,
      devices: registries.devices,
      entityRegistry: registries.entityRegistry,
      areas: registries.areas,
      registryError,
      callService,
      reconnect,
    }),
    [status, error, entities, registries, registryError, callService, reconnect]
  );

  return <HAContext.Provider value={value}>{children}</HAContext.Provider>;
}

/** Zugriff auf Verbindungsstatus, Entitäten, Registries und callService. */
export function useHomeAssistant() {
  const context = useContext(HAContext);
  if (!context) {
    throw new Error('useHomeAssistant muss innerhalb von <HAProvider> verwendet werden.');
  }
  return context;
}
