import { entityDomain, entityName } from '../../lib/haEntity.js';
import {
  MUSIC_SWITCH_SUFFIX,
  SELECT_KINDS,
  brightnessPct,
  hasMeaningfulState,
  isNoneOption,
  isOn,
  isUnavailable,
  looksLikeSegment,
  primaryLightScore,
  segmentIndex,
  selectKind,
  supportsBrightness,
  supportsColorTemp,
  supportsEffects,
  supportsRgb,
} from './capabilities.js';

/**
 * Baut aus Entitäten + Registries ein Array von Geräten. Das ist die zentrale
 * Logik des Moduls: die gesamte UI konsumiert nur noch dieses Modell und sieht
 * niemals eine rohe Entitätenliste.
 *
 * Warum überhaupt: Home Assistant liefert über 60 Entitäten in der Domain
 * `light`, weil jedes LED-Segment eine eigene Lichtentität ist. Nach Entität
 * gruppiert entstünden 60 Kacheln für acht Geräte. Die Gruppierung nach
 * `device_id` aus der Entity-Registry ist die einzige verlässliche Klammer.
 *
 * Nichts hier kennt einen Hersteller oder ein Modell. Zugeordnet wird über
 * Domain, `entity_category` und das Suffix der entity_id.
 *
 * Die Datei ist absichtlich frei von React: so lässt sich die Gruppierung gegen
 * einen echten Registry-Abzug in Node prüfen, ohne einen Browser zu brauchen.
 * Die Hooks darauf liegen in useDevices.js.
 */

/**
 * Domains, für die dieses Modul Bedienelemente mitbringt. Ein Gerät ohne eine
 * einzige Entität daraus (Sun, Backup, HACS, Wetter, TTS …) taucht nicht auf –
 * eine Karte, die nichts kann, ist nur Rauschen.
 */
const CONTROLLABLE_DOMAINS = new Set(['light', 'switch', 'select', 'number', 'button']);

/**
 * Sensoren, die den Rest-Kontingent einer Cloud-API melden. Erkannt über das
 * Suffix statt über eine feste entity_id, damit eine zweite Integration mit
 * demselben Muster automatisch mitgezählt wird.
 */
const RATE_LIMIT_SUFFIX = '_api_rate_limit_remaining';

const collator = new Intl.Collator('de', { sensitivity: 'base', numeric: true });

/**
 * Gehört die Entität in die Bedienoberfläche?
 *
 * Ausgeschlossen wird, was Home Assistant selbst nicht als Bedienelement
 * versteht: Diagnose- und Konfigurationsentitäten (die kommen zusammengeklappt
 * ganz unten), sowie alles, was der Nutzer in Home Assistant ausgeblendet oder
 * abgeschaltet hat. Letzteres ist nicht kosmetisch: die Integration liefert auf
 * jedem Gerät ein deaktiviertes `select.*_diy_style` ohne Zustand mit – ohne
 * diesen Filter stünde überall ein leeres Auswahlfeld.
 */
function isHiddenFromUi(registryEntry) {
  return Boolean(registryEntry.hidden_by || registryEntry.disabled_by);
}

/**
 * Verteilt die Entitäten eines Geräts auf Fächer. Reine Sortierarbeit – welche
 * Fähigkeiten daraus folgen, entscheidet `deriveCapabilities`.
 */
function bucketEntities(registryEntries, entities) {
  const buckets = {
    lights: [],
    switches: [],
    musicSwitch: null,
    selects: {},
    otherSelects: [],
    numbers: [],
    buttons: [],
    diagnostics: [],
    configEntities: [],
  };

  for (const registryEntry of registryEntries) {
    const entity = entities[registryEntry.entity_id];
    // Ohne Zustand gibt es nichts anzuzeigen (z. B. abgeschaltete Entitäten).
    if (!entity) continue;

    if (registryEntry.entity_category === 'diagnostic') {
      buckets.diagnostics.push(entity);
      continue;
    }
    if (registryEntry.entity_category === 'config') {
      buckets.configEntities.push(entity);
      continue;
    }
    if (isHiddenFromUi(registryEntry)) continue;

    switch (entityDomain(entity.entity_id)) {
      case 'light':
        buckets.lights.push(entity);
        break;
      case 'switch':
        // Der Musik-Switch wird herausgezogen, weil er in der Detailansicht
        // zusammen mit dem Musikmodus-Select eine Einheit bildet. Läge er auch
        // in `switches`, würde er zweimal gerendert.
        if (entity.entity_id.endsWith(MUSIC_SWITCH_SUFFIX)) buckets.musicSwitch = entity;
        else buckets.switches.push(entity);
        break;
      case 'select': {
        const kind = selectKind(entity);
        // Unbekannte Suffixe werden nicht verworfen, sondern generisch
        // gerendert – eine neue Integration bringt so ihr Select mit, ohne
        // dass hier etwas ergänzt werden muss.
        if (kind) buckets.selects[kind.key] = entity;
        else buckets.otherSelects.push(entity);
        break;
      }
      case 'number':
        buckets.numbers.push(entity);
        break;
      case 'button':
        buckets.buttons.push(entity);
        break;
      default:
        break;
    }
  }

  return buckets;
}

/**
 * Trennt Haupt-Lichtentität und Segmente.
 *
 * Bei nur einer Lichtentität ist die Sache klar. Bei mehreren gewinnt die mit
 * der höchsten Fähigkeitsbewertung; die übrigen gelten nur dann als Segmente,
 * wenn sie auch wie Segmente aussehen. Was weder Haupt-Entität noch Segment
 * ist, bleibt als eigenständiges Licht erhalten, statt stillschweigend zu
 * verschwinden – ein Gerät mit zwei echten Lampen kommt vor.
 */
function splitLights(lights) {
  if (lights.length === 0) return { primary: null, segments: [], extraLights: [] };

  const ranked = [...lights].sort((a, b) => primaryLightScore(b) - primaryLightScore(a));
  const [primary, ...rest] = ranked;
  const primaryRank = primaryLightScore(primary);

  const segments = [];
  const extraLights = [];

  for (const light of rest) {
    if (looksLikeSegment(light) && primaryLightScore(light) < primaryRank) segments.push(light);
    else extraLights.push(light);
  }

  segments.sort((a, b) => segmentIndex(a) - segmentIndex(b));
  extraLights.sort((a, b) => collator.compare(entityName(a), entityName(b)));

  return { primary, segments, extraLights };
}

/**
 * Leitet die Fähigkeiten des Geräts ab – ausschließlich aus Attributen und dem
 * Vorhandensein von Entitäten, niemals aus Namen oder Modellen.
 */
function deriveCapabilities({ primary, segments, selects, musicSwitch }) {
  return {
    onOff: Boolean(primary),
    brightness: supportsBrightness(primary),
    rgb: supportsRgb(primary),
    colorTemp: supportsColorTemp(primary),
    effects: supportsEffects(primary),
    hasSegments: segments.length > 0,
    hasScenes: Boolean(selects.scene) || supportsEffects(primary),
    hasDiy: Boolean(selects.diyScene),
    hasSnapshots: Boolean(selects.snapshot),
    // Switch und Select sind unabhängig: es gibt Geräte mit Musik-Switch ohne
    // Modus-Select. Beides einzeln behandeln, nicht das eine vom anderen
    // abhängig machen.
    hasMusic: Boolean(musicSwitch) || Boolean(selects.musicMode),
  };
}

/** Hat das Gerät überhaupt etwas, das die UI bedienen kann? */
function isRenderable(buckets) {
  return (
    buckets.lights.length > 0 ||
    buckets.switches.length > 0 ||
    Boolean(buckets.musicSwitch) ||
    Object.keys(buckets.selects).length > 0 ||
    buckets.otherSelects.length > 0 ||
    buckets.numbers.length > 0 ||
    buckets.buttons.length > 0
  );
}

/**
 * @param {object} input
 * @param {Record<string, object>} input.entities Live-Zustände aus subscribeEntities
 * @param {Map<string, object>} input.devices Device-Registry
 * @param {Map<string, object>} input.entityRegistry Entity-Registry
 * @param {Map<string, object>} input.areas Area-Registry
 * @returns {Array<object>} Geräte, nach Namen sortiert
 */
export function buildDevices({ entities, devices, entityRegistry, areas }) {
  if (devices.size === 0 || entityRegistry.size === 0) return [];

  // Entitäten ohne device_id (person, todo, …) lassen sich keinem Gerät
  // zuordnen und haben in einer Geräteübersicht keinen Platz.
  const byDevice = new Map();
  for (const registryEntry of entityRegistry.values()) {
    if (!registryEntry.device_id) continue;
    const list = byDevice.get(registryEntry.device_id);
    if (list) list.push(registryEntry);
    else byDevice.set(registryEntry.device_id, [registryEntry]);
  }

  const result = [];

  for (const [deviceId, device] of devices) {
    const registryEntries = byDevice.get(deviceId);
    if (!registryEntries) continue;

    const hasControllable = registryEntries.some((entry) =>
      CONTROLLABLE_DOMAINS.has(entityDomain(entry.entity_id))
    );
    if (!hasControllable) continue;

    const buckets = bucketEntities(registryEntries, entities);
    if (!isRenderable(buckets)) continue;

    const { primary, segments, extraLights } = splitLights(buckets.lights);

    // Der Bereich hängt am Gerät. Eine einzelne Entität darf ihn überschreiben
    // (so sieht Home Assistant es vor); für die Karte zählt die Zuordnung der
    // Haupt-Entität, sonst die des Geräts.
    const primaryOverride = primary
      ? entityRegistry.get(primary.entity_id)?.area_id
      : null;
    const areaId = primaryOverride ?? device.area_id ?? null;

    result.push({
      id: deviceId,
      name: device.name_by_user || device.name || 'Unbenanntes Gerät',
      areaId,
      areaName: areaId ? (areas.get(areaId)?.name ?? null) : null,
      primary,
      segments,
      extraLights,
      selects: buckets.selects,
      otherSelects: buckets.otherSelects,
      switches: buckets.switches,
      music: { switch: buckets.musicSwitch, select: buckets.selects.musicMode ?? null },
      numbers: buckets.numbers,
      buttons: [...buckets.buttons, ...buckets.configEntities.filter(isButton)],
      diagnostics: buckets.diagnostics,
      capabilities: deriveCapabilities({
        primary,
        segments,
        selects: buckets.selects,
        musicSwitch: buckets.musicSwitch,
      }),
    });
  }

  return result.sort((a, b) => collator.compare(a.name, b.name));
}

function isButton(entity) {
  return entityDomain(entity.entity_id) === 'button';
}

/**
 * Gruppiert Geräte nach Bereich. Bereiche ohne Geräte fallen weg, Geräte ohne
 * Bereich kommen als letzte Gruppe.
 */
export function groupByArea(devices, areas) {
  const groups = new Map();

  for (const device of devices) {
    const key = device.areaId ?? '';
    const group = groups.get(key);
    if (group) group.devices.push(device);
    else
      groups.set(key, {
        areaId: device.areaId,
        areaName: device.areaId ? (areas.get(device.areaId)?.name ?? device.areaId) : null,
        devices: [device],
      });
  }

  const named = [...groups.values()].filter((group) => group.areaId);
  const unassigned = [...groups.values()].filter((group) => !group.areaId);

  named.sort((a, b) => collator.compare(a.areaName, b.areaName));
  return [...named, ...unassigned];
}

/**
 * Welcher Effekt läuft gerade – und woher wir das wissen.
 *
 * Am Gerät nachgemessen (Wohnzimmer, Govee-Cloud-Integration, 30.07.2026):
 *  - `light.turn_on` mit `effect: "Forest"` setzt sowohl `light.attributes.effect`
 *    als auch den Zustand von `select.*_scene` auf "Forest". Beide Quellen sind
 *    sich einig.
 *  - Eine DIY-Szene über `select.select_option` lässt `light.attributes.effect`
 *    auf `null` und `select.*_scene` auf "None". Nur `select.*_diy_scene` trägt
 *    den Wert. Deshalb ist das DIY-Select hier die Anzeigequelle.
 *  - Ein Snapshot verhält sich wie eine einmalige Aktion: `select.*_snapshot`
 *    behält seinen Wert für immer, auch nachdem die Lampe längst eine andere
 *    Farbe hat. Ein Snapshot gilt deshalb NIE als „aktiver Effekt" – sonst
 *    stünde dort dauerhaft etwas Falsches.
 *  - Ebenso der Musikmodus: das ist eine Einstellung des Musik-Switches,
 *    kein laufender Effekt.
 */
export function activeEffect(device) {
  const fromLight = device.primary?.attributes?.effect;
  if (fromLight && !isNoneOption(fromLight)) {
    return { name: fromLight, source: 'scene' };
  }

  const diy = device.selects.diyScene;
  if (hasMeaningfulState(diy) && !isNoneOption(diy.state)) {
    return { name: diy.state, source: 'diy' };
  }

  return null;
}

/** Kurzbeschreibung des Gerätezustands für die Karte. */
export function describeState(device) {
  const { primary } = device;
  if (!primary) return null;
  if (isUnavailable(primary)) return 'nicht erreichbar';
  if (!isOn(primary)) return 'aus';
  return device.capabilities.brightness ? `an · ${brightnessPct(primary)}%` : 'an';
}

/** Alle Rate-Limit-Sensoren der eingebundenen Integrationen. */
export function findRateLimitSensors(entities) {
  return Object.values(entities).filter(
    (entity) =>
      entity.entity_id.startsWith('sensor.') && entity.entity_id.endsWith(RATE_LIMIT_SUFFIX)
  );
}

/** Beschriftungen der bekannten Select-Arten, für Tabs und Überschriften. */
export const selectLabels = Object.fromEntries(
  SELECT_KINDS.map((kind) => [kind.key, kind.label])
);

/**
 * Kurzes Label einer Entität innerhalb ihres Geräts.
 *
 * Home Assistant stellt den Gerätenamen vor jeden Entitätsnamen
 * („Wohnzimmer Main Light"). In einer Karte, die schon „Wohnzimmer" heißt, ist
 * die Wiederholung nur Ballast.
 *
 * Die englischen Bezeichnungen bleiben unverändert. Eine Übersetzungstabelle
 * („Main Light" -> „Hauptlicht") wäre genau die herstellerspezifische Annahme,
 * die dieses Modul vermeidet: sie würde beim nächsten Gerät nicht greifen.
 */
export function shortLabel(entity, deviceName) {
  const name = entityName(entity);
  if (!deviceName) return name;

  if (name.toLowerCase().startsWith(deviceName.toLowerCase())) {
    const rest = name.slice(deviceName.length).trim();
    if (rest) return rest;
  }
  return name;
}
