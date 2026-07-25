import {
  ERR_CANNOT_CONNECT,
  ERR_CONNECTION_LOST,
  ERR_HASS_HOST_REQUIRED,
  ERR_INVALID_AUTH,
  ERR_INVALID_HTTPS_TO_HTTP,
  createConnection,
  createLongLivedTokenAuth,
} from 'home-assistant-js-websocket';

/**
 * Verbindungsaufbau zu Home Assistant.
 *
 * Home Assistant ist laut Projektarchitektur der einzige Abstraktions-Hub für
 * Geräte – diese Datei kapselt den WebSocket-Zugang dorthin. Konfiguriert wird
 * über .env.local:
 *
 *   VITE_HA_URL=http://smarthome:8123
 *   VITE_HA_TOKEN=<Long-Lived Access Token aus dem HA-Profil>
 */

export const HA_URL = (import.meta.env.VITE_HA_URL ?? '').trim().replace(/\/+$/, '');
const HA_TOKEN = (import.meta.env.VITE_HA_TOKEN ?? '').trim();

/** Ohne URL + Token macht ein Verbindungsversuch keinen Sinn. */
export const isHaConfigured = Boolean(HA_URL && HA_TOKEN);

/**
 * Baut die Verbindung auf. Wirft bei Fehlschlag – der Aufrufer soll den
 * Fehlercode über describeHaError() in Klartext übersetzen.
 *
 * Nach erfolgreichem Aufbau kümmert sich die Bibliothek selbst um Reconnects;
 * `connection.addEventListener('ready' | 'disconnected' | 'reconnect-error')`
 * meldet die Zustandswechsel.
 */
export async function connectToHa() {
  if (!isHaConfigured) {
    throw Object.assign(new Error('Home Assistant ist nicht konfiguriert.'), {
      code: ERR_HASS_HOST_REQUIRED,
    });
  }

  const auth = createLongLivedTokenAuth(HA_URL, HA_TOKEN);
  return createConnection({ auth });
}

/**
 * Übersetzt die numerischen Fehlercodes der Bibliothek in verständliche Texte.
 * Unbekannte Fehler werden durchgereicht statt verschluckt.
 */
export function describeHaError(error) {
  switch (error) {
    case ERR_HASS_HOST_REQUIRED:
      return 'Es ist keine Home-Assistant-Adresse hinterlegt. Trage VITE_HA_URL und VITE_HA_TOKEN in .env.local ein und starte den Dev-Server neu.';
    case ERR_CANNOT_CONNECT:
      return `Home Assistant unter ${HA_URL || '(keine URL)'} ist nicht erreichbar. Läuft der Container, und stimmt die Adresse?`;
    case ERR_INVALID_AUTH:
      return 'Der Long-Lived Access Token wurde abgelehnt. Vermutlich abgelaufen oder in Home Assistant widerrufen.';
    case ERR_CONNECTION_LOST:
      return 'Die Verbindung zu Home Assistant wurde unterbrochen.';
    case ERR_INVALID_HTTPS_TO_HTTP:
      return `Die App läuft über HTTPS, Home Assistant ist aber als http:// hinterlegt (${HA_URL}). Der Browser blockiert diese Mischung – Home Assistant ebenfalls über HTTPS einbinden.`;
    default:
      if (error instanceof Error) return error.message;
      return `Unerwarteter Fehler beim Verbinden mit Home Assistant (Code ${error}).`;
  }
}
