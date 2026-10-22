import type { LocalDate } from "./dates";
import { amountIn, type Food } from "./foods";
import type { NutrientCode } from "./nutrients";

export interface LogEntry {
  id: string;
  foodId: string;
  grams: number;
  logDate: LocalDate;
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
