/**
 * Ableitung der Fähigkeiten einer Entität aus ihren Home-Assistant-Attributen.
 *
 * Grundregel des Moduls: die UI fragt nie „welches Gerät ist das", sondern nur
 * „was kann diese Entität". Nichts in dieser Datei kennt einen Hersteller, ein
 * Modell oder einen Gerätenamen – alles kommt aus `supported_color_modes`,
 * `supported_features` und `effect_list`. Nur so erscheint ein künftiges Gerät
 * (Matter-Lampe, Zigbee-Sensor) automatisch mit den passenden Bedienelementen,
 * ohne dass hier Code angefasst werden muss.
 *
 * Referenz: https://www.home-assistant.io/integrations/light/
 */

/** LightEntityFeature.EFFECT – Bit 2 in `supported_features` einer Lichtentität. */
export const LIGHT_FEATURE_EFFECT = 4;

/**
 * Color-Modes, in denen die Lampe eine echte Farbe darstellen kann.
 * `color_temp` fehlt hier absichtlich: Weißtöne sind keine Farbe im Sinne
 * eines Farbwählers und haben ihr eigenes Bedienelement.
 */
const RGB_MODES = ['hs', 'xy', 'rgb', 'rgbw', 'rgbww'];

/**
 * Color-Modes, in denen sich die Helligkeit einstellen lässt – also alle außer
 * `onoff` und `unknown`. Ausgeschrieben statt als Negativliste, damit ein neuer
 * Modus aus Home Assistant nicht stillschweigend als dimmbar durchrutscht.
 */
const BRIGHTNESS_MODES = [
  'brightness',
  'white',
  'color_temp',
  'hs',
  'xy',
  'rgb',
  'rgbw',
  'rgbww',
];

/** Erkennt die Segmentnummer in einer entity_id wie `light.flur_segment_12`. */
const SEGMENT_ID_PATTERN = /_segment_(\d+)$/i;

/** Letzte Zahl in einem Anzeigenamen – nur als Rückfallebene für die Sortierung. */
const TRAILING_NUMBER_PATTERN = /(\d+)\s*$/;

function attributes(entity) {
  return entity?.attributes ?? {};
}

/** Die von der Lampe gemeldeten Color-Modes, immer als Array. */
export function colorModes(entity) {
  const modes = attributes(entity).supported_color_modes;
  return Array.isArray(modes) ? modes : [];
}

export function supportedFeatures(entity) {
  return attributes(entity).supported_features ?? 0;
}

export function isOn(entity) {
  return entity?.state === 'on';
}

/**
 * Nicht bedienbar: Home Assistant kennt die Entität, kann sie aber nicht
 * erreichen. Wird in der UI markiert und sperrt die Bedienelemente – aber es
 * versteckt sie nicht, sonst wüsste niemand, was das Gerät sonst kann.
 */
export function isUnavailable(entity) {
  return !entity || entity.state === 'unavailable' || entity.state === 'unknown';
}

export function supportsBrightness(entity) {
  return colorModes(entity).some((mode) => BRIGHTNESS_MODES.includes(mode));
}

export function supportsRgb(entity) {
  return colorModes(entity).some((mode) => RGB_MODES.includes(mode));
}

export function supportsColorTemp(entity) {
  return colorModes(entity).includes('color_temp');
}

/**
 * Effekte gelten nur als vorhanden, wenn beides stimmt: das Feature-Bit ist
 * gesetzt UND es gibt tatsächlich eine Liste. Manche Integrationen melden das
 * Bit, bevor sie die Szenen vom Gerät geladen haben – ein leerer Picker wäre
 * die Folge.
 */
export function supportsEffects(entity) {
  if ((supportedFeatures(entity) & LIGHT_FEATURE_EFFECT) === 0) return false;
  return (attributes(entity).effect_list?.length ?? 0) > 0;
}

export function effectList(entity) {
  return attributes(entity).effect_list ?? [];
}

/**
 * Helligkeit in Prozent (0–100).
 * Home Assistant liefert 0–255 und lässt das Attribut weg, wenn die Lampe aus ist.
 */
export function brightnessPct(entity) {
  const raw = attributes(entity).brightness;
  if (typeof raw !== 'number') return 0;
  return Math.round((raw / 255) * 100);
}

/** Aktuelle Farbe als Hex-String, oder null wenn gerade keine gesetzt ist. */
export function colorHex(entity) {
  const rgb = attributes(entity).rgb_color;
  if (!Array.isArray(rgb) || rgb.length < 3) return null;
  return rgbToHex(rgb);
}

/** Farbtemperatur in Kelvin samt der von der Lampe gemeldeten Grenzen. */
export function colorTempRange(entity) {
  const attrs = attributes(entity);
  return {
    min: attrs.min_color_temp_kelvin ?? 2000,
    max: attrs.max_color_temp_kelvin ?? 6500,
    current: attrs.color_temp_kelvin ?? null,
  };
}

export function rgbToHex([r, g, b]) {
  const toHex = (value) =>
    Math.max(0, Math.min(255, Math.round(value))).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/** '#4dabf7' -> [77, 171, 247]; gibt null bei unbrauchbarer Eingabe zurück. */
export function hexToRgb(hex) {
  const match = /^#?([\da-f]{6})$/i.exec(hex?.trim() ?? '');
  if (!match) return null;
  const value = parseInt(match[1], 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

/**
 * Wie gut taugt eine Lichtentität als Haupt-Entität ihres Geräts?
 *
 * Ein Gerät kann mehrere Lichtentitäten haben (eine Hauptlampe plus ein
 * Segment je LED-Abschnitt). Entschieden wird über Attribute, nicht über den
 * Namen: die Haupt-Entität kann mehr – Farbtemperatur, Effekte, überhaupt
 * irgendein Feature-Bit. Segmente melden `supported_features: 0` und können
 * ausschließlich `rgb`.
 */
export function primaryLightScore(entity) {
  let score = 0;
  if (supportsColorTemp(entity)) score += 4;
  if (supportsEffects(entity)) score += 4;
  if (supportedFeatures(entity) > 0) score += 2;
  if (supportsBrightness(entity)) score += 1;
  return score;
}

/**
 * Sieht die Entität wie ein Segment aus? Kein eigenes Feature, keine
 * Farbtemperatur – nur eine Farbe.
 *
 * Die Prüfung allein genügt nicht: eine einfache RGB-Lampe sieht genauso aus.
 * Deshalb wird sie in deviceModel.js nur angewandt, wenn das Gerät zusätzlich
 * eine stärkere Haupt-Entität hat.
 */
export function looksLikeSegment(entity) {
  return supportedFeatures(entity) === 0 && !supportsColorTemp(entity) && supportsRgb(entity);
}

/**
 * Position eines Segments in der Kette. Primär aus der entity_id (technisch,
 * stabil), erst danach aus der letzten Zahl im Anzeigenamen – Namen kann man
 * in Home Assistant frei ändern.
 */
export function segmentIndex(entity) {
  const fromId = SEGMENT_ID_PATTERN.exec(entity.entity_id);
  if (fromId) return Number(fromId[1]);

  const fromName = TRAILING_NUMBER_PATTERN.exec(attributes(entity).friendly_name ?? '');
  return fromName ? Number(fromName[1]) : Number.MAX_SAFE_INTEGER;
}

/**
 * Bekannte Select-Arten, erkannt am Suffix der entity_id.
 *
 * Die Reihenfolge ist bedeutsam: `_diy_scene` endet ebenfalls auf `_scene`.
 * Spezifische Suffixe müssen deshalb zuerst geprüft werden, sonst landet die
 * DIY-Liste in den Szenen.
 */
export const SELECT_KINDS = [
  { key: 'diyScene', suffix: '_diy_scene', label: 'DIY' },
  { key: 'musicMode', suffix: '_music_mode', label: 'Musik' },
  { key: 'snapshot', suffix: '_snapshot', label: 'Snapshots' },
  { key: 'scene', suffix: '_scene', label: 'Szenen' },
];

/** Suffix eines Switches, der den Musikmodus schaltet. */
export const MUSIC_SWITCH_SUFFIX = '_music_mode';

/**
 * Gehört die Entität zum Themenblock „Musik"?
 *
 * Erkannt über die entity_id, im gleichen Muster wie die Select-Suffixe. Damit
 * landet ein `number.*_music_sensitivity` beim Musik-Schalter statt in einem
 * beziehungslosen Regler-Kasten – ohne dass hier ein Gerätename auftaucht.
 */
export function belongsToMusic(entity) {
  return entity.entity_id.includes('_music_');
}

/** Klassifiziert eine select-Entität; null bei unbekanntem Suffix. */
export function selectKind(entity) {
  return SELECT_KINDS.find((kind) => entity.entity_id.endsWith(kind.suffix)) ?? null;
}

/** Optionen einer select-Entität ohne die Aus-Option. */
export function selectOptions(entity) {
  return (attributes(entity).options ?? []).filter((option) => !isNoneOption(option));
}

/**
 * „None" ist keine Szene, sondern der Ausschalter für Effekte. Wir rendern die
 * Option nie als Listeneintrag, sondern als eigenen Knopf „Effekt beenden".
 */
export function isNoneOption(option) {
  return option === 'None' || option === 'none';
}

/** Kennt das Select eine Aus-Option? Nur dann lässt sich ein Effekt beenden. */
export function hasNoneOption(entity) {
  return (attributes(entity).options ?? []).some(isNoneOption);
}

/** Der Name der Aus-Option, wie das Select sie schreibt. */
export function noneOptionOf(entity) {
  return (attributes(entity).options ?? []).find(isNoneOption) ?? 'None';
}

/** Hat die Entität einen sinnvoll anzeigbaren Zustand? */
export function hasMeaningfulState(entity) {
  return !!entity && entity.state !== 'unknown' && entity.state !== 'unavailable';
}
