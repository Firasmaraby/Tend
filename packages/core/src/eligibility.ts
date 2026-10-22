// The one gate every recommending surface goes through.
//
// v1 bug: allergies chosen in onboarding did not change suggestions. Here the
// pool is filtered once, before ranking, and surfaces receive only the pool.
// Best right now, density mode, browse-by-my-three, Learn top 10, the plate
// sandbox, swaps, pairings, shopping lists and simple plates all call this.

import { NEVER_SUGGEST, type Food } from "./foods";
import { DIET_PATTERNS, type Allergen, type DietPattern, type Profile } from "./profile";

const dietRank = (d: DietPattern) => DIET_PATTERNS.indexOf(d);

export type IneligibleReason =
  | "not_suggestable"
  | "no_serving"
  | "never_suggest_category"
  | "diet_untagged"
  | "diet"
  | "allergens_untagged"
  | "allergen"
  | "pregnancy_untagged"
  | "pregnancy_safety";

export type EligibilityProfile = Pick<Profile, "diet" | "allergens" | "status">;

/** Why a food can't be suggested to her, or null if it can. */
export function ineligibleReason(food: Food, profile: EligibilityProfile): IneligibleReason | null {
  if (!food.suggestable) return "not_suggestable";
  if (!food.serving) return "no_serving";
  if (NEVER_SUGGEST.has(food.category)) return "never_suggest_category";
  if (food.diet === null) return "diet_untagged";
  if (dietRank(food.diet) > dietRank(profile.diet)) return "diet";
  if (food.allergens === null) return "allergens_untagged";
  if (food.allergens.some((a) => profile.allergens.includes(a))) return "allergen";
  if (profile.status === "pregnant") {
    if (food.pregnancyFlags === null) return "pregnancy_untagged";
    if (food.pregnancyFlags.length > 0) return "pregnancy_safety";
  }
  return null;
}

declare const eligibleBrand: unique symbol;
/**
 * A pool that has been through the gate. Ranking and every other recommending
 * function accept only this type, so an unfiltered list can't reach them
 * without a type error.
 */
export type EligiblePool = readonly Food[] & { readonly [eligibleBrand]: true };

export function eligibleFoods(foods: readonly Food[], profile: EligibilityProfile): EligiblePool {
  return foods.filter((f) => ineligibleReason(f, profile) === null) as unknown as EligiblePool;
}

/** For search and logging: every food is findable, with her allergens labelled. */
export function allergenWarnings(food: Food, profile: Pick<Profile, "allergens">): Allergen[] {
  return (food.allergens ?? []).filter((a) => profile.allergens.includes(a));
}
