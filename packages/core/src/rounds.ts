import { addDays, daysBetween, isWithin, type LocalDate } from "./dates";
import { coverage, groupByDate, totalFor, type FoodLookup, type LogEntry } from "./coverage";
import { NUTRIENT_CODES, type NutrientCode } from "./nutrients";

export const ROUND_DAYS = 42;
/** Fewer logged days than this: no verdict, no proposal, no carry-forward. */
export const MIN_LOGGED_DAYS = 21;
/** More of her servings than this with an unknown value: the gap is in the data, not her. */
export const MAX_UNKNOWN_SHARE = 0.3;
/** Picking the next three within this many days of the end keeps rounds contiguous. */
export const CONTIGUITY_GRACE_DAYS = 7;
const EPS = 1e-9;

/**
 * focus:   one of her three
 * carried: one of her three, carried forward from a miss
 * locked:  reached (or kept) in an earlier round; tracked, lightly weighted
 * project: missed twice running; coached differently, never forced into a slot
 */
export type Role = "focus" | "carried" | "locked" | "project";

export interface RoundNutrient {
  nutrient: NutrientCode;
  role: Role;
}

export interface Round {
  number: number;
  startedOn: LocalDate;
  endsOn: LocalDate;
  nutrients: readonly RoundNutrient[];
}

/** The one window convention, used everywhere: [startedOn, endsOn], both inclusive. */
export function roundEndsOn(startedOn: LocalDate): LocalDate {
  return addDays(startedOn, ROUND_DAYS - 1);
}

export function isInRound(d: LocalDate, round: Pick<Round, "startedOn" | "endsOn">): boolean {
  return isWithin(d, round.startedOn, round.endsOn);
}

/** 1-based day of the round, or null outside it. */
export function dayOfRound(d: LocalDate, round: Pick<Round, "startedOn" | "endsOn">): number | null {
  return isInRound(d, round) ? daysBetween(round.startedOn, d) + 1 : null;
}

/**
 * Rounds are contiguous: days logged after a round ends but before she picks
 * the next three count toward the next round. After a long absence the new
 * round starts on the day she picks instead, so she isn't dropped into the
 * middle of a round she never saw.
 */
export function nextRoundStart(previousEndsOn: LocalDate, pickedOn: LocalDate): LocalDate {
  return daysBetween(previousEndsOn, pickedOn) <= CONTIGUITY_GRACE_DAYS ? addDays(previousEndsOn, 1) : pickedOn;
}

export type Outcome = "reached" | "missed" | "not_enough_data";
export type NoDataReason = "low_logging" | "data_gap";

export interface NutrientRoundResult {
  nutrient: NutrientCode;
  role: Role;
  loggedDays: number;
  totalDays: number;
  /** Mean coverage over logged days, unclamped. This is the intake verdict. */
  meanLogged: number;
  /** Logged-day means per week of the round; null where nothing was logged. */
  weekly: (number | null)[];
  unknownShare: number;
  outcome: Outcome;
  noDataReason?: NoDataReason;
}

export function nutrientResult(
  nutrient: NutrientCode,
  role: Role,
  mark: number,
  round: Pick<Round, "startedOn" | "endsOn">,
  entries: readonly LogEntry[],
  food: FoodLookup,
): NutrientRoundResult {
  const inWindow = entries.filter((e) => isInRound(e.logDate, round));
  const byDate = groupByDate(inWindow);
  const totalDays = daysBetween(round.startedOn, round.endsOn) + 1;

  let sum = 0;
  const weekSums: number[] = [];
  const weekDays: number[] = [];
  for (const [date, dayEntries] of byDate) {
    const c = coverage(totalFor(dayEntries, nutrient, food), mark);
    sum += c;
    const w = Math.floor(daysBetween(round.startedOn, date) / 7);
    weekSums[w] = (weekSums[w] ?? 0) + c;
    weekDays[w] = (weekDays[w] ?? 0) + 1;
  }
  const loggedDays = byDate.size;
  const meanLogged = loggedDays === 0 ? 0 : sum / loggedDays;
  const weeks = Math.ceil(totalDays / 7);
  const weekly = Array.from({ length: weeks }, (_, w) => {
    const d = weekDays[w];
    return d ? (weekSums[w] ?? 0) / d : null;
  });

  const all = totalFor(inWindow, nutrient, food);
  const unknownShare = all.entries === 0 ? 0 : all.unknownEntries / all.entries;

  const base = { nutrient, role, loggedDays, totalDays, meanLogged, weekly, unknownShare };
  if (loggedDays < MIN_LOGGED_DAYS) return { ...base, outcome: "not_enough_data", noDataReason: "low_logging" };
  if (unknownShare > MAX_UNKNOWN_SHARE) return { ...base, outcome: "not_enough_data", noDataReason: "data_gap" };
  return { ...base, outcome: meanLogged + EPS >= 1 ? "reached" : "missed" };
}

export interface RoundClose {
  lowData: boolean;
  /** At most one: the lowest first-time miss. */
  carried: NutrientCode | null;
  locked: NutrientCode[];
  projects: NutrientCode[];
  /** Back in the pool to pick from: no verdict was possible. */
  released: NutrientCode[];
}

const order = (n: NutrientCode) => NUTRIENT_CODES.indexOf(n);

/**
 * End of round. Honest in substance: a miss is a miss, and the lowest one
 * comes with her. A second miss in a row changes the approach instead of
 * repeating it (DECISIONS.md §7).
 */
export function closeRound(results: readonly NutrientRoundResult[]): RoundClose {
  const judged = results.filter((r) => r.role === "focus" || r.role === "carried" || r.role === "project");
  const lowData = judged.some((r) => r.noDataReason === "low_logging");
  const keepLocked = results.filter((r) => r.role === "locked").map((r) => r.nutrient);
  const keepProjects = results.filter((r) => r.role === "project").map((r) => r.nutrient);

  if (lowData) {
    return {
      lowData: true,
      carried: null,
      locked: keepLocked,
      projects: keepProjects,
      released: judged.filter((r) => r.role !== "project").map((r) => r.nutrient),
    };
  }

  const locked = [...keepLocked];
  const projects: NutrientCode[] = [];
  const released: NutrientCode[] = [];
  const firstMisses: NutrientRoundResult[] = [];

  for (const r of judged) {
    if (r.outcome === "reached") locked.push(r.nutrient);
    else if (r.outcome === "not_enough_data") {
      if (r.role === "project") projects.push(r.nutrient);
      else released.push(r.nutrient);
    } else if (r.role === "carried" || r.role === "project") projects.push(r.nutrient);
    else firstMisses.push(r);
  }

  firstMisses.sort((a, b) => a.meanLogged - b.meanLogged || order(a.nutrient) - order(b.nutrient));
  const [lowest, ...rest] = firstMisses;
  locked.push(...rest.map((r) => r.nutrient));

  return { lowData: false, carried: lowest?.nutrient ?? null, locked, projects, released };
}

/**
 * A locked-in nutrient has drifted when each of its last three weeks with
 * data sat under the mark. The app offers it back; it never forces it.
 */
export function isDrifting(weeklyMeans: readonly (number | null)[]): boolean {
  const recent = weeklyMeans.slice(-3);
  return recent.length === 3 && recent.every((m) => m !== null && m + EPS < 1);
}
