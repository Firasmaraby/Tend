// A nutrient is only offered for a round if the app can coach it credibly:
// enough suggestable foods, after her diet filter, that each deliver a real
// share of her mark in one serving. This floor fails silently unless
// something reports it, so this module reports, and enforcement reads the report.

import { eligibleFoods, type EligibilityProfile } from "./eligibility";
import { amountIn, type Food } from "./foods";
import { NUTRIENTS, NUTRIENT_CODES, type NutrientCode } from "./nutrients";
import type { Marks } from "./targets";

export const MIN_QUALIFYING_FOODS = 15;
export const PASS_QUALIFYING_FOODS = 20;
export const MIN_SERVING_SHARE = 0.15;

export type FloorStatus = "pass" | "near" | "fail";

export interface SelectabilityRow {
  nutrient: NutrientCode;
  qualifying: number;
  status: FloorStatus;
  selectable: boolean;
  examples: string[];
}

export function floorStatus(qualifying: number): FloorStatus {
  if (qualifying >= PASS_QUALIFYING_FOODS) return "pass";
  if (qualifying >= MIN_QUALIFYING_FOODS) return "near";
  return "fail";
}

export function selectabilityReport(foods: readonly Food[], marks: Marks, profile: EligibilityProfile): SelectabilityRow[] {
  const pool = eligibleFoods(foods, profile);
  return NUTRIENT_CODES.filter((n) => NUTRIENTS[n].roundPolicy === "selectable").map((n) => {
    const mark = marks[n].value;
    const qualifyingFoods = pool.filter((f) => {
      const amt = f.serving ? amountIn(f, n, f.serving.grams) : undefined;
      return amt !== undefined && amt / mark >= MIN_SERVING_SHARE;
    });
    const qualifying = new Set(qualifyingFoods.map((f) => f.dupGroupId ?? f.id)).size;
    const status = floorStatus(qualifying);
    return {
      nutrient: n,
      qualifying,
      status,
      selectable: status !== "fail",
      examples: qualifyingFoods.slice(0, 5).map((f) => f.name),
    };
  });
}
