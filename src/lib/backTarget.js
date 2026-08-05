/**
 * Der übergeordnete Pfad einer Route – ein Segment weniger.
 *
 * Rückfallebene für den Zurück-Pfeil im Header, wenn es in dieser Sitzung
 * keinen Verlauf gibt (Deep-Link, geteilte Datei, frisch geöffnete PWA).
 * `history.back()` würde dort aus der App hinausführen.
 *
 * Absichtlich frei von React und Router, damit sich die Zuordnung in Node
 * prüfen lässt – dieselbe Trennung wie bei `deviceModel.js` und `model.js`.
 */
export function parentPath(pathname) {
  const segments = pathname.split('/').filter(Boolean);
  if (segments.length <= 1) return '/';
  return `/${segments.slice(0, -1).join('/')}`;
}
