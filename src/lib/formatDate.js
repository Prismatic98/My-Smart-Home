const absoluteFormatter = new Intl.DateTimeFormat('de-DE', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

const timeFormatter = new Intl.DateTimeFormat('de-DE', { timeStyle: 'short' });
const relativeFormatter = new Intl.RelativeTimeFormat('de-DE', { numeric: 'auto' });

/** z. B. "24. Juli 2026, 13:45" */
export function formatDateTime(timestamp) {
  return absoluteFormatter.format(new Date(timestamp));
}

/**
 * Kurzform fürs Änderungsdatum:
 * "vor 5 Minuten" · "gestern, 21:03" · "24. Juli 2026, 13:45"
 */
export function formatRelativeDateTime(timestamp, now = Date.now()) {
  const diffMs = timestamp - now;
  const diffMinutes = Math.round(diffMs / 60_000);

  if (Math.abs(diffMinutes) < 1) return 'gerade eben';
  if (Math.abs(diffMinutes) < 60) return relativeFormatter.format(diffMinutes, 'minute');

  const diffHours = Math.round(diffMs / 3_600_000);
  if (Math.abs(diffHours) < 24 && isSameDay(timestamp, now)) {
    return relativeFormatter.format(diffHours, 'hour');
  }

  if (isYesterday(timestamp, now)) {
    return `gestern, ${timeFormatter.format(new Date(timestamp))}`;
  }

  return formatDateTime(timestamp);
}

function isSameDay(a, b) {
  const da = new Date(a);
  const dbb = new Date(b);
  return (
    da.getFullYear() === dbb.getFullYear() &&
    da.getMonth() === dbb.getMonth() &&
    da.getDate() === dbb.getDate()
  );
}

function isYesterday(timestamp, now) {
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  return isSameDay(timestamp, yesterday.getTime());
}