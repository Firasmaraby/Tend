// Period timing (founder decision 2026-10-24, from the v1 beta).
//
// The iron mark is NOT raised on period days: the menstruating iron RDA
// already averages menstrual losses across the month, and iron stores smooth
// them over weeks. Raising the mark would count the losses twice. Instead,
// on period days iron gets extra weight in suggestions (even when it isn't one
// of her three) and the iron pairing tips switch on.
//
// Data minimisation: Tend keeps only the start date of the current period and
// how many days hers usually lasts. No cycle history, no predictions.

import { addDays, isWithin, type LocalDate } from "./dates";
import type { NutrientCode } from "./nutrients";
import type { Profile } from "./profile";
import type { Weights } from "./ranking";

export interface PeriodState {
  startedOn: LocalDate;
  /** How many days hers usually lasts, 2 to 10. */
  lengthDays: number;
  /** Set when she ends it early or late; otherwise startedOn + lengthDays - 1. */
  endedOn?: LocalDate;
}

export const PERIOD_DEFAULT_DAYS = 5;
/** Added to iron's suggestion weight on period days. */
export const PERIOD_IRON_BOOST = 0.5;
/** Iron's weight on period days when iron isn't one of her nutrients at all. */
export const PERIOD_IRON_FLOOR = 0.6;

export function periodEndsOn(p: PeriodState): LocalDate {
  return p.endedOn ?? addDays(p.startedOn, Math.min(10, Math.max(2, p.lengthDays)) - 1);
}

/** Only for someone who menstruates and isn't pregnant. */
export function isPeriodDay(profile: Pick<Profile, "menstruating" | "status">, period: PeriodState | null, d: LocalDate): boolean {
  if (!period || !profile.menstruating || profile.status === "pregnant") return false;
  return isWithin(d, period.startedOn, periodEndsOn(period));
}

/** Day of her period, counting up from 1, or null. */
export function periodDay(period: PeriodState, d: LocalDate): number | null {
  if (!isWithin(d, period.startedOn, periodEndsOn(period))) return null;
  return Math.round((Date.parse(d) - Date.parse(period.startedOn)) / 86_400_000) + 1;
}

/** Suggestion weights on a period day: iron gets extra attention. Marks never change. */
export function withPeriodWeights(weights: Weights, active: boolean): Weights {
  if (!active) return weights;
  const iron = weights.iron;
  return { ...weights, iron: iron ? iron + PERIOD_IRON_BOOST : PERIOD_IRON_FLOOR };
}

/** Nutrients that pairing advice should cover today: hers, plus iron on period days. */
export function adviceNutrients(hers: readonly NutrientCode[], active: boolean): NutrientCode[] {
  return active && !hers.includes("iron") ? [...hers, "iron"] : [...hers];
}
