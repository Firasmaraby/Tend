// Better together: absorption guidance. Tend never changes the numbers for
// absorption (DECISIONS.md): food tables report what a food contains, and
// absorption varies too much between people to put a percentage on it.
// Instead these rules notice when a pairing would help, and celebrate when
// she makes one. Every rule here is about adding something, never avoiding.
//
// Evidence (summarised for founder review):
// - Vitamin C (about 25 mg or more in the same meal) and meat, fish or poultry
//   increase absorption of non-heme iron. Strong, consistent evidence.
// - Fat in the meal increases absorption of carotenoids (pro-vitamin A) and
//   vitamin K from vegetables. Well established.
// - Oxalate in spinach and Swiss chard binds most of their calcium. Kale, bok
//   choy and collards give calcium that is absorbed about as well as milk's.

import type { FoodLookup, LogEntry, Meal } from "./coverage";
import type { EligiblePool } from "./eligibility";
import { narrowPool } from "./eligibility";
import { amountIn, type Food, type FoodCategory } from "./foods";
import type { NutrientCode } from "./nutrients";
import type { Marks } from "./targets";

/** Animal foods whose iron is partly heme, and which also help non-heme iron absorb. */
export const HEME_CATEGORIES: ReadonlySet<FoodCategory> = new Set(["meat", "poultry", "fish", "shellfish", "organ_meat"]);
const PLANT_CATEGORIES: ReadonlySet<FoodCategory> = new Set(["leafy_greens", "vegetables", "fruit", "legumes", "grains", "nuts_seeds", "small_seeds"]);

export const VITAMIN_C_HELPER_MG = 25;
export const FAT_HELPER_G = 5;
/** A food counts as a real source when one serving gives this share of the mark. */
export const TARGET_SHARE = 0.1;
export const FAT_SOLUBLE_TARGET_SHARE = 0.2;

export type PairingRuleId = "iron_vitamin_c" | "fat_soluble" | "calcium_oxalate";

export interface PairingRule {
  id: PairingRuleId;
  /** The nutrients this rule is about. It only fires when one is among hers. */
  nutrients: readonly NutrientCode[];
  /** "pair" rules have helpers she can add; "know" rules teach a choice. */
  kind: "pair" | "know";
}

export const PAIRING_RULES: Record<PairingRuleId, PairingRule> = {
  iron_vitamin_c: { id: "iron_vitamin_c", nutrients: ["iron"], kind: "pair" },
  fat_soluble: { id: "fat_soluble", nutrients: ["vit_k", "vit_a_rae"], kind: "pair" },
  calcium_oxalate: { id: "calcium_oxalate", nutrients: ["calcium"], kind: "know" },
};

const share = (food: Food, n: NutrientCode, grams: number, marks: Marks) => (amountIn(food, n, grams) ?? 0) / marks[n].value;

/** Carotenoid vitamin A: RAE minus preformed retinol. Plant foods with unknown retinol count as carotenoid. */
function carotenoidRae(food: Food, grams: number): number {
  const rae = amountIn(food, "vit_a_rae", grams) ?? 0;
  const retinol = amountIn(food, "retinol", grams);
  return retinol === undefined ? (PLANT_CATEGORIES.has(food.category) ? rae : 0) : Math.max(0, rae - retinol);
}

/** Is this serving of food the kind a rule is about? */
export function isTarget(rule: PairingRuleId, food: Food, grams: number, marks: Marks): boolean {
  switch (rule) {
    case "iron_vitamin_c":
      return !HEME_CATEGORIES.has(food.category) && share(food, "iron", grams, marks) >= TARGET_SHARE;
    case "fat_soluble":
      return (
        PLANT_CATEGORIES.has(food.category) &&
        (share(food, "vit_k", grams, marks) >= FAT_SOLUBLE_TARGET_SHARE || carotenoidRae(food, grams) / marks.vit_a_rae.value >= FAT_SOLUBLE_TARGET_SHARE)
      );
    case "calcium_oxalate":
      return (food.traits ?? []).includes("high_oxalate");
  }
}

/** Does this serving help the rule's target? (Know-rules have no helpers.) */
export function isHelper(rule: PairingRuleId, food: Food, grams: number): boolean {
  switch (rule) {
    case "iron_vitamin_c":
      return HEME_CATEGORIES.has(food.category) || (amountIn(food, "vit_c", grams) ?? 0) >= VITAMIN_C_HELPER_MG;
    case "fat_soluble":
      return (amountIn(food, "fat", grams) ?? 0) >= FAT_HELPER_G;
    case "calcium_oxalate":
      return false;
  }
}

const relevant = (rule: PairingRule, hers: readonly NutrientCode[]) => rule.nutrients.some((n) => hers.includes(n));

export interface PairingMoment {
  rule: PairingRuleId;
  /** The first food today that the rule is about. */
  target: Food;
  /** A helper was logged the same day (the app doesn't track meals yet, so "same day" stands in for "same meal"). */
  paired: boolean;
  helper?: Food;
  /** The target's meal, when tagged. */
  meal?: Meal;
}

/** Same meal when both are tagged; otherwise the same day is the best we know. */
function sameMeal(a: LogEntry, b: LogEntry): boolean {
  return a.meal === undefined || b.meal === undefined || a.meal === b.meal;
}

/**
 * Some food-table values overstate what the body gets. These still count in
 * her totals (we never change her numbers) but are not used to rank
 * suggestions or to pass the selectability floor: spinach is not suggested as
 * a calcium source.
 */
export function rankable(food: Food, nutrient: NutrientCode): boolean {
  return !(nutrient === "calcium" && (food.traits ?? []).includes("high_oxalate"));
}

/** One moment per rule for today's log, only for nutrients that are hers. */
export function pairingsToday(today: readonly LogEntry[], lookup: FoodLookup, marks: Marks, hers: readonly NutrientCode[]): PairingMoment[] {
  const moments: PairingMoment[] = [];
  for (const rule of Object.values(PAIRING_RULES)) {
    if (!relevant(rule, hers)) continue;
    const targets = today.filter((e) => {
      const f = lookup(e.foodId);
      return f !== undefined && isTarget(rule.id, f, e.grams, marks);
    });
    if (targets.length === 0) continue;
    const helperFor = (t: LogEntry) =>
      rule.kind === "pair"
        ? today.find((e) => {
            const f = lookup(e.foodId);
            // The target itself can carry its own helper (avocado brings its own fat).
            return f !== undefined && sameMeal(t, e) && isHelper(rule.id, f, e.grams);
          })
        : undefined;
    // Report a pairing she made if there is one; otherwise the first target.
    const pairedTarget = targets.find((t) => helperFor(t) !== undefined);
    const targetEntry = pairedTarget ?? targets[0]!;
    const helperEntry = pairedTarget ? helperFor(pairedTarget) : undefined;
    const moment: PairingMoment = { rule: rule.id, target: lookup(targetEntry.foodId)!, paired: helperEntry !== undefined };
    if (targetEntry.meal) moment.meal = targetEntry.meal;
    const helper = helperEntry ? lookup(helperEntry.foodId) : undefined;
    if (helper) moment.helper = helper;
    moments.push(moment);
  }
  return moments;
}

/** For a suggestion row: which pairing would help this food, if any. */
export function pairingFor(food: Food, marks: Marks, hers: readonly NutrientCode[]): PairingRuleId | null {
  if (!food.serving) return null;
  for (const rule of Object.values(PAIRING_RULES)) {
    if (rule.kind !== "pair" || !relevant(rule, hers)) continue;
    if (isTarget(rule.id, food, food.serving.grams, marks) && !isHelper(rule.id, food, food.serving.grams)) return rule.id;
  }
  return null;
}

/** Helper foods to suggest for a rule, strongest first, from an eligible pool only. */
export function helperFoods(rule: PairingRuleId, pool: EligiblePool, limit = 3): Food[] {
  const strength = (f: Food) => {
    const g = f.serving!.grams;
    return rule === "iron_vitamin_c" ? (amountIn(f, "vit_c", g) ?? 0) : (amountIn(f, "fat", g) ?? 0);
  };
  // Plant vitamin C sources first for iron: the pairing tip should work for everyone.
  const helpers = narrowPool(pool, (f) => !!f.serving && isHelper(rule, f, f.serving.grams) && !(rule === "iron_vitamin_c" && HEME_CATEGORIES.has(f.category)));
  return [...helpers].sort((a, b) => strength(b) - strength(a)).slice(0, limit);
}
