/**
 * Auswertung der Home-Assistant-Attribute einer light-Entität.
 * Referenz: https://www.home-assistant.io/integrations/light/
 */

/** Color-Modes, bei denen die Lampe eine echte Farbe kann. */
const COLOR_MODES = ['hs', 'xy', 'rgb', 'rgbw', 'rgbww'];

/** Color-Modes ohne jede Dimmbarkeit. */
const NON_DIMMABLE_MODES = ['onoff', 'unknown'];

export function isOn(entity) {
  return entity.state === 'on';
}

export function isUnavailable(entity) {
  return entity.state === 'unavailable' || entity.state === 'unknown';
}

export function supportsColor(entity) {
  const modes = entity.attributes?.supported_color_modes ?? [];
  return modes.some((mode) => COLOR_MODES.includes(mode));
}

export function supportsBrightness(entity) {
  const modes = entity.attributes?.supported_color_modes ?? [];
  if (modes.length === 0) return false;
  return modes.some((mode) => !NON_DIMMABLE_MODES.includes(mode));
}

/**
 * Helligkeit in Prozent (0–100).
 * Home Assistant liefert 0–255 und lässt das Attribut weg, wenn die Lampe aus ist.
 */
export function brightnessPct(entity) {
  const raw = entity.attributes?.brightness;
  if (typeof raw !== 'number') return 0;
  return Math.round((raw / 255) * 100);
}

/** Aktuelle Farbe als Hex-String, oder null wenn gerade keine gesetzt ist. */
export function colorHex(entity) {
  const rgb = entity.attributes?.rgb_color;
  if (!Array.isArray(rgb) || rgb.length < 3) return null;
  return rgbToHex(rgb);
}

export function rgbToHex([r, g, b]) {
  const toHex = (value) => Math.max(0, Math.min(255, Math.round(value))).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/** '#4dabf7' -> [77, 171, 247]; gibt null bei unbrauchbarer Eingabe zurück. */
export function hexToRgb(hex) {
  const match = /^#?([\da-f]{6})$/i.exec(hex?.trim() ?? '');
  if (!match) return null;
  const value = parseInt(match[1], 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}
