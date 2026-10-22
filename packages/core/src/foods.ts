// The library contract as the app sees it. The founder's merged database is
// mapped into this shape by one adapter; nothing else reads raw rows.

import type { ValueCode } from "./nutrients";
import type { Allergen, DietPattern } from "./profile";

export const FOOD_CATEGORIES = [
  "leafy_greens",
  "vegetables",
  "fruit",
  "legumes",
  "grains",
  "nuts_seeds",
  "small_seeds",
  "fish",
  "shellfish",
  "meat",
  "poultry",
  "organ_meat",
  "eggs",
  "milk",
  "yogurt",
  "cheese",
  "oils_fats",
  "fortified",
  "herbs_spices",
  "aromatics",
  "garnish",
  "beverages",
  "other",
] as const;
export type FoodCategory = (typeof FOOD_CATEGORIES)[number];

/** Not eaten in the portions a ranking engine assumes. Searchable, never suggested. */
export const NEVER_SUGGEST: ReadonlySet<FoodCategory> = new Set(["herbs_spices", "aromatics", "garnish"]);

export type FoodForm = "raw" | "cooked" | "boiled" | "roasted" | "steamed" | "dried" | "canned" | "prepared";

// Never suggested during pregnancy (she can still find and log them). Based on
// Health Canada's food-safety guidance for pregnancy and its mercury advice;
// sources and review notes are in DECISIONS.md §10. high_retinol is our own
// conservative rule (preformed vitamin A is teratogenic).
export const PREGNANCY_FLAGS = [
  "high_retinol",
  /** Fresh or frozen tuna, shark, swordfish, marlin, orange roughy, escolar. Canned light tuna is fine. */
  "high_mercury_fish",
  /** Canned albacore: allowed up to a weekly amount, so not something we push. */
  "albacore_tuna",
  /** Raw or undercooked meat, fish, shellfish, and raw or lightly cooked eggs. */
  "raw_or_undercooked_animal",
  "unpasteurised_dairy",
  "unpasteurised_juice",
  /** Soft and semi-soft cheeses (brie, camembert, havarti) and all blue-veined cheeses. */
  "soft_cheese",
  /** Non-dried deli meats (bologna, roast beef, turkey breast). Dried salami is not flagged. */
  "deli_meat",
  "refrigerated_smoked_seafood",
  "refrigerated_pate",
  "raw_sprouts",
] as const;
export type PregnancyFlag = (typeof PREGNANCY_FLAGS)[number];

export interface Serving {
  grams: number;
  /** Human-readable, e.g. "1 cup cooked (198 g)". */
  label: string;
}

export interface Food {
  id: string;
  name: string;
  category: FoodCategory;
  form: FoodForm;
  /**
   * Values per 100 g. A missing key means unknown. It is never zero: once an
   * unknown has been collapsed into zero, the two can't be told apart again.
   */
  per100g: Readonly<Partial<Record<ValueCode, number>>>;
  suggestable: boolean;
  serving?: Serving;
  /** The most restrictive pattern the food fits. null = not yet tagged. */
  diet: DietPattern | null;
  /** null = not yet tagged. Untagged is never "assumed safe". */
  allergens: readonly Allergen[] | null;
  /** null = not yet reviewed for pregnancy food safety. */
  pregnancyFlags: readonly PregnancyFlag[] | null;
  /** Foods that are the same thing share a group, so lists don't show both. */
  dupGroupId?: string;
}

/** Amount of a value in a given weight. undefined means unknown, never 0. */
export function amountIn(food: Food, code: ValueCode, grams: number): number | undefined {
  const per100 = food.per100g[code];
  return per100 === undefined ? undefined : (per100 * grams) / 100;
}
