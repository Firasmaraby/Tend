// Recommending more is not always safe. Before trusting a column for a UL,
// ask what distinction it might collapse: RAE hides retinol, DFE hides folic
// acid, and the magnesium, vitamin E and niacin ULs are about supplements.

import { amountIn, type Food } from "./foods";
import type { FoodLookup, LogEntry } from "./coverage";
import { NUTRIENT_CODES, type NutrientCode, type ValueCode } from "./nutrients";
import type { Marks } from "./targets";

/** One serving above this share of a UL: at most one serving a day in suggestions. */
export const CAP_SHARE = 0.5;

function ulColumn(nutrient: NutrientCode, marks: Marks): ValueCode | null {
  const m = marks[nutrient];
  if (m.ul === undefined) return null;
  switch (m.ulAppliesTo) {
    case "total":
      return nutrient;
    case "preformed_retinol":
      return "retinol";
    case "folic_acid":
      return "folic_acid";
    case "supplemental_only":
    case "none":
      return null;
  }
}

/** Amount of the UL-relevant form in a weight of food; undefined if no UL applies or unknown. */
export function ulAmount(food: Food, nutrient: NutrientCode, grams: number, marks: Marks): number | undefined {
  const col = ulColumn(nutrient, marks);
  return col === null ? undefined : amountIn(food, col, grams);
}

export type ServingGuard =
  | { kind: "ok" }
  | { kind: "capped"; maxServingsPerDay: 1; nutrient: NutrientCode }
  | { kind: "excluded"; nutrient: NutrientCode; reason: "serving_over_ul" | "day_would_exceed_ul" | "cap_reached" };

/**
 * Whether a food may be suggested now, given what she has logged today.
 * Unknown amounts can't trigger a guard: we only act on what we know.
 */
export function servingGuard(
  food: Food,
  grams: number,
  marks: Marks,
  today: readonly LogEntry[],
  lookup: FoodLookup,
): ServingGuard {
  let cap: ServingGuard = { kind: "ok" };
  for (const n of NUTRIENT_CODES) {
    const ul = marks[n].ul;
    const serving = ulAmount(food, n, grams, marks);
    if (ul === undefined || serving === undefined) continue;
    if (serving > ul) return { kind: "excluded", nutrient: n, reason: "serving_over_ul" };
    let sofar = 0;
    for (const e of today) {
      const f = lookup(e.foodId);
      sofar += (f && ulAmount(f, n, e.grams, marks)) ?? 0;
    }
    // Only a food that adds some of this form can push the day past the UL.
    if (serving > 0 && sofar + serving > ul) return { kind: "excluded", nutrient: n, reason: "day_would_exceed_ul" };
    if (serving > CAP_SHARE * ul && cap.kind === "ok") cap = { kind: "capped", maxServingsPerDay: 1, nutrient: n };
  }
  if (cap.kind === "capped" && today.some((e) => e.foodId === food.id)) {
    return { kind: "excluded", nutrient: cap.nutrient, reason: "cap_reached" };
  }
  return cap;
}
