const UNITS = ['B', 'KB', 'MB', 'GB', 'TB'];

/**
 * Bytes in eine lesbare Größe. Basis 1024, wie es Dateimanager gewohnt sind.
 * Kleine Einheiten ohne Nachkommastelle, ab MB mit einer – "1,4 MB" liest sich
 * besser als "1,44 MB" und genauer muss es in einer Liste nicht sein.
 */
export function formatBytes(bytes) {
  if (bytes === null || bytes === undefined || Number.isNaN(bytes)) return '–';
  if (bytes === 0) return '0 B';

  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), UNITS.length - 1);
  const value = bytes / 1024 ** exponent;
  const digits = exponent >= 2 && value < 100 ? 1 : 0;

  return `${value.toLocaleString('de-DE', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })} ${UNITS[exponent]}`;
}

/** Restzeit als kurzer Text: "12 s", "3 min", "1 h 20 min". */
export function formatDuration(seconds) {
  if (seconds === null || seconds === undefined || !Number.isFinite(seconds)) return null;
  if (seconds < 60) return `${Math.max(1, Math.round(seconds))} s`;

  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min`;

  const hours = Math.floor(minutes / 60);
  return `${hours} h ${minutes % 60} min`;
}
