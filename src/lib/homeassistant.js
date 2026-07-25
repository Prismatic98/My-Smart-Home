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
 * Geräte – diese Datei kapselt den WebSocket-Zugang dorthin.
 *
 * Konfiguration über Env-Variablen (Vite backt sie beim Build ins Bundle):
 *
 *   VITE_HA_TOKEN=<Long-Lived Access Token aus dem HA-Profil>   (immer nötig)
 *   VITE_HA_URL=http://smarthome:8123                           (optional)
 *
 * Ohne VITE_HA_URL läuft alles über die eigene Origin. Genau so ist es in
 * Produktion gedacht: Caddy liefert die App aus und reicht /api/* an
 * 127.0.0.1:8123 weiter (siehe Caddyfile). Same-origin heißt kein CORS und –
 * hinter dem HTTPS von Tailscale – kein Mixed Content, weil der Browser die
 * WebSocket-Verbindung dann als wss:// auf denselben Host aufbaut.
 *
 * Im Dev-Server gibt es diesen Proxy nicht; dort zeigt VITE_HA_URL in
 * .env.local direkt auf die Home-Assistant-Instanz.
 */

const configuredHaUrl = (import.meta.env.VITE_HA_URL ?? '').trim().replace(/\/+$/, '');
const HA_TOKEN = (import.meta.env.VITE_HA_TOKEN ?? '').trim();

/**
 * Basis-Adresse für Home Assistant. Aus ihr leitet
 * home-assistant-js-websocket auch den Socket ab: <HA_URL>/api/websocket,
 * mit http→ws bzw. https→wss.
 */
export const HA_URL = configuredHaUrl || window.location.origin;

/** True, wenn Home Assistant über die eigene Origin (also den Proxy) läuft. */
export const isSameOriginHa = !configuredHaUrl;

/** Die Adresse steht immer, es fehlt also höchstens der Token. */
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

  // Der Socket-Pfad kommt aus HA_URL: <HA_URL>/api/websocket. Zeigt HA_URL auf
  // die eigene Origin, landet die Verbindung damit beim Reverse-Proxy.
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
      return 'Es ist kein Home-Assistant-Token hinterlegt. VITE_HA_TOKEN setzen – im Dev in .env.local (danach Dev-Server neu starten), auf dem Pi in .env.prod (danach neu bauen).';
    case ERR_CANNOT_CONNECT:
      return isSameOriginHa
        ? `Home Assistant ist über ${HA_URL}/api/websocket nicht erreichbar. Läuft der HA-Container, und reicht der Reverse-Proxy /api/* an 127.0.0.1:8123 weiter?`
        : `Home Assistant unter ${HA_URL} ist nicht erreichbar. Läuft der Container, und stimmt die Adresse?`;
    case ERR_INVALID_AUTH:
      return 'Der Long-Lived Access Token wurde abgelehnt. Vermutlich abgelaufen oder in Home Assistant widerrufen.';
    case ERR_CONNECTION_LOST:
      return 'Die Verbindung zu Home Assistant wurde unterbrochen.';
    case ERR_INVALID_HTTPS_TO_HTTP:
      // Kann nur passieren, wenn VITE_HA_URL gesetzt ist – über die eigene
      // Origin stimmt das Schema zwangsläufig.
      return `Die App läuft über HTTPS, Home Assistant ist aber als http:// hinterlegt (${HA_URL}). Der Browser blockiert diese Mischung – VITE_HA_URL leer lassen, dann läuft Home Assistant über den Proxy auf derselben Origin.`;
    default:
      if (error instanceof Error) return error.message;
      return `Unerwarteter Fehler beim Verbinden mit Home Assistant (Code ${error}).`;
  }
}
