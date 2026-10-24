// Calendar dates in her zone. A LocalDate is "YYYY-MM-DD" and is the only
// thing day membership ever compares. Timestamps never decide which day a log
// belongs to.

export type LocalDate = string & { readonly __brand: "LocalDate" };

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const MS_PER_DAY = 86_400_000;

export function asLocalDate(s: string): LocalDate {
  const m = DATE_RE.exec(s);
  if (!m) throw new Error(`Not a calendar date: ${s}`);
  const [, y, mo, d] = m;
  const t = Date.UTC(Number(y), Number(mo) - 1, Number(d));
  if (toIso(t) !== s) throw new Error(`Not a real calendar date: ${s}`);
  return s as LocalDate;
}

function toIso(utcMs: number): string {
  return new Date(utcMs).toISOString().slice(0, 10);
}

/** Days since 1970-01-01 for a calendar date. Zone-free by construction. */
export function dayNumber(d: LocalDate): number {
  const [y, m, day] = d.split("-").map(Number) as [number, number, number];
  return Date.UTC(y, m - 1, day) / MS_PER_DAY;
}

export function fromDayNumber(n: number): LocalDate {
  return toIso(n * MS_PER_DAY) as LocalDate;
}

export function addDays(d: LocalDate, days: number): LocalDate {
  return fromDayNumber(dayNumber(d) + days);
}

/** Whole days from a to b (b − a). */
export function daysBetween(a: LocalDate, b: LocalDate): number {
  return dayNumber(b) - dayNumber(a);
}

/** Inclusive on both ends. */
export function isWithin(d: LocalDate, start: LocalDate, end: LocalDate): boolean {
  const n = dayNumber(d);
  return n >= dayNumber(start) && n <= dayNumber(end);
}

/** The calendar date an instant falls on in an IANA zone. */
export function localDateIn(instant: Date, timeZone: string): LocalDate {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(instant);
  const get = (type: string) => parts.find((p) => p.type === type)?.value;
  return asLocalDate(`${get("year")}-${get("month")}-${get("day")}`);
}

/**
 * How far back she can add, remove or change food (DECISIONS.md, 2026-10-24):
 * the last 7 days, matching the week strip. Long enough to fill in what she
 * forgot; short enough that nobody rebuilds a six-week round from memory the
 * night before it ends.
 */
export const BACKDATE_DAYS = 7;

/**
 * Whether a day can still be changed. `lockedBefore` is the first day of the
 * open round: days in a round that has closed keep the verdict they produced.
 */
export function canEditDate(target: LocalDate, today: LocalDate, lockedBefore?: LocalDate, maxDaysBack = BACKDATE_DAYS): boolean {
  const diff = daysBetween(target, today);
  if (diff < 0 || diff > maxDaysBack) return false;
  return lockedBefore === undefined || dayNumber(target) >= dayNumber(lockedBefore);
}

/** canEditDate for a moment in her zone (what the server enforces on every write). */
export function canLogFor(target: LocalDate, now: Date, timeZone: string, lockedBefore?: LocalDate): boolean {
  return canEditDate(target, localDateIn(now, timeZone), lockedBefore);
}
