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
 * Backdating is "yesterday" only: a flat battery doesn't become a permanent
 * zero, but nobody can rebuild a round the night before it ends.
 */
export function canLogFor(target: LocalDate, now: Date, timeZone: string): boolean {
  const diff = daysBetween(target, localDateIn(now, timeZone));
  return diff === 0 || diff === 1;
}
