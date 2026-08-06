// Timezone-aware date helpers.
// Renewal dates are calendar dates (YYYY-MM-DD), so "days until" must be a
// calendar-day difference in the user's timezone, not a UTC clock difference.

export function todayInTimeZone(timeZone?: string): string {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: timeZone || undefined,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
  } catch {
    return new Intl.DateTimeFormat('en-CA', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
  }
}

function toUtcMidnight(dateStr: string): number {
  const [y, m, d] = dateStr.slice(0, 10).split('-').map(Number);
  return Date.UTC(y, (m || 1) - 1, d || 1);
}

/** Whole calendar days between today (in timeZone) and the given date. */
export function daysUntil(dateStr: string, timeZone?: string): number {
  return Math.round(
    (toUtcMidnight(dateStr) - toUtcMidnight(todayInTimeZone(timeZone))) / 86400000
  );
}
