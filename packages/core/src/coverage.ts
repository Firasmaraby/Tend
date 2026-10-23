import type { LocalDate } from "./dates";
import { amountIn, type Food } from "./foods";
import type { NutrientCode } from "./nutrients";

export const MEALS = ["breakfast", "lunch", "dinner", "snack"] as const;
export type Meal = (typeof MEALS)[number];

export interface LogEntry {
  id: string;
  foodId: string;
  grams: number;
  logDate: LocalDate;
  /** Optional. Lets pairing advice say "same meal" instead of "same day". */
  meal?: Meal;
}

/** A sensible default from her local clock; she can change it with one tap. */
export function defaultMeal(localHour: number, localMinute = 0): Meal {
  const t = localHour + localMinute / 60;
  if (t >= 4 && t < 10.5) return "breakfast";
  if (t >= 10.5 && t < 14.5) return "lunch";
  if (t >= 17 && t < 21.5) return "dinner";
  return "snack";
}

export interface NutrientTotal {
  /** Sum of known values. With unknowns present this is a lower bound: "at least". */
  known: number;
  /** Servings that had no value for this nutrient. */
  unknownEntries: number;
  entries: number;
  hasUnknown: boolean;
}

export type FoodLookup = (id: string) => Food | undefined;

export function totalFor(entries: readonly LogEntry[], nutrient: NutrientCode, food: FoodLookup): NutrientTotal {
  let known = 0;
  let unknownEntries = 0;
  for (const e of entries) {
    const f = food(e.foodId);
    const amt = f ? amountIn(f, nutrient, e.grams) : undefined;
    if (amt === undefined) unknownEntries++;
    else known += amt;
  }
  return { known, unknownEntries, entries: entries.length, hasUnknown: unknownEntries > 0 };
}

/**
 * Coverage of the mark. Unclamped: 300% counts as 3.0, because clamping
 * punishes foods eaten in occasional large doses (salmon, liver-free B12 days).
 */
export function coverage(total: NutrientTotal, mark: number): number {
  return total.known / mark;
}

export function groupByDate(entries: readonly LogEntry[]): Map<LocalDate, LogEntry[]> {
  const byDate = new Map<LocalDate, LogEntry[]>();
  for (const e of entries) {
    const list = byDate.get(e.logDate);
    if (list) list.push(e);
    else byDate.set(e.logDate, [e]);
  }
  return byDate;
}
