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
  const [attempt, setAttempt] = useState(0);

  const connectionRef = useRef(null);

  useEffect(() => {
    if (!isHaConfigured) {
      setStatus('unconfigured');
      return undefined;
    }

    let cancelled = false;
    let unsubscribeEntities;
    let connection;
    let heartbeat;

    const handleReady = () => {
      if (!cancelled) {
        setStatus('connected');
        setError(null);
      }
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
      .then((conn) => {
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
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('online', checkAlive);
      unsubscribeEntities?.();
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
    () => ({ status, error, entities, callService, reconnect }),
    [status, error, entities, callService, reconnect]
  );

  return <HAContext.Provider value={value}>{children}</HAContext.Provider>;
}

/** Zugriff auf Verbindungsstatus, Entitäten und callService. */
export function useHomeAssistant() {
  const context = useContext(HAContext);
  if (!context) {
    throw new Error('useHomeAssistant muss innerhalb von <HAProvider> verwendet werden.');
  }
  return context;
}

/**
 * Alle Entitäten einer Domain ("light", "switch", …), nach Anzeigename sortiert.
 */
export function useEntitiesByDomain(domain) {
  const { entities } = useHomeAssistant();

  return useMemo(() => {
    const prefix = `${domain}.`;
    return Object.values(entities)
      .filter((entity) => entity.entity_id.startsWith(prefix))
      .sort((a, b) =>
        entityName(a).localeCompare(entityName(b), 'de', { sensitivity: 'base' })
      );
  }, [entities, domain]);
}

/** Anzeigename einer Entität, mit entity_id als Rückfallebene. */
export function entityName(entity) {
  return entity.attributes?.friendly_name ?? entity.entity_id.split('.')[1] ?? entity.entity_id;
}
