// Minimal offset fallback (minutes) for common zones, used only if the
// runtime's Intl timezone support is unavailable.
const FALLBACK_OFFSET_MINUTES: Record<string, number> = {
  'Asia/Kolkata': 330, 'Asia/Calcutta': 330, 'Asia/Dubai': 240, 'Asia/Singapore': 480,
  'Asia/Tokyo': 540, 'Europe/London': 60, 'Europe/Berlin': 120, 'Europe/Paris': 120,
  'America/New_York': -240, 'America/Chicago': -300, 'America/Los_Angeles': -420,
  'Australia/Sydney': 600, 'UTC': 0,
};

export function todayInTimeZone(timeZone?: string): string {
  const tz = timeZone || 'UTC';
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: tz,
      year: 'numeric', month: '2-digit', day: '2-digit',
    }).formatToParts(new Date());
    const y = parts.find((p) => p.type === 'year')?.value;
    const m = parts.find((p) => p.type === 'month')?.value;
    const d = parts.find((p) => p.type === 'day')?.value;
    if (y && m && d) {
      const utcToday = new Date().toISOString().slice(0, 10);
      const formatted = `${y}-${m}-${d}`;
      // If the runtime silently ignored the timeZone, fall back to offset math.
      const offset = FALLBACK_OFFSET_MINUTES[tz];
      if (formatted === utcToday && offset !== undefined && offset !== 0) {
        return new Date(Date.now() + offset * 60000).toISOString().slice(0, 10);
      }
      return formatted;
    }
  } catch {
    // fall through
  }
  const offset = FALLBACK_OFFSET_MINUTES[tz] ?? 0;
  return new Date(Date.now() + offset * 60000).toISOString().slice(0, 10);
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
