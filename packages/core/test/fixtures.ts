// Test fixtures, not library data. Values are chosen to match EXPECTED_VALUES.md
// (most follow USDA SR Legacy). Keys that are left out are unknown, on purpose.

import { asLocalDate, type Food, type LogEntry, type Profile } from "../src";

type FoodOpts = Partial<Omit<Food, "id" | "name" | "category" | "per100g">>;

export function food(id: string, category: Food["category"], per100g: Food["per100g"], grams: number, opts: FoodOpts = {}): Food {
  return {
    id,
    name: id.replace(/_/g, " "),
    category,
    form: "cooked",
    per100g,
    suggestable: true,
    serving: { grams, label: `${grams} g` },
    diet: "vegan",
    allergens: [],
    pregnancyFlags: [],
    ...opts,
  };
}

export const salmon = food("salmon", "fish", { epa_dha: 1202, energy_kcal: 206 }, 100, { diet: "pescatarian", allergens: ["fish"] });
export const lentils = food("lentils_cooked", "legumes", { iron: 3.33, calcium: 19, fibre: 7.9, energy_kcal: 116 }, 198);
export const iceberg = food("iceberg_lettuce", "leafy_greens", { vit_k: 24.1, energy_kcal: 14 }, 72, { form: "raw" });
export const brazilNuts = food("brazil_nuts", "nuts_seeds", { selenium: 1917, energy_kcal: 659 }, 20, { allergens: ["tree_nut"], form: "raw" });
export const oysters = food("oysters_eastern_cooked", "shellfish", { zinc: 78.6, energy_kcal: 79 }, 85, { diet: "omnivore", allergens: ["mollusc"] });
export const beefLiver = food("beef_liver", "organ_meat", { vit_a_rae: 9442, retinol: 9442, iron: 6.54, energy_kcal: 175 }, 85, {
  diet: "omnivore",
  pregnancyFlags: ["high_retinol"],
});
export const spinach = food("spinach_cooked", "leafy_greens", { vit_a_rae: 469, retinol: 0, iron: 3.57, energy_kcal: 23 }, 180);
export const pumpkinSeeds = food("pumpkin_seeds", "nuts_seeds", { magnesium: 592, energy_kcal: 574 }, 30, { form: "roasted" });
export const fortifiedCereal = food("fortified_cereal", "fortified", { folate_dfe: 2975, folic_acid: 1750, energy_kcal: 370 }, 40, {
  allergens: ["wheat", "gluten"],
  form: "prepared",
});
export const peanutButter = food("peanut_butter", "nuts_seeds", { magnesium: 168, energy_kcal: 588 }, 32, { allergens: ["peanut"], form: "prepared" });
export const thyme = food("thyme", "herbs_spices", { iron: 124 }, 1, { form: "dried" });

export const ALL_FIXTURES: Food[] = [salmon, lentils, iceberg, brazilNuts, oysters, beefLiver, spinach, pumpkinSeeds, fortifiedCereal, peanutButter, thyme];

export const lookup = (foods: readonly Food[] = ALL_FIXTURES) => {
  const byId = new Map(foods.map((f) => [f.id, f]));
  return (id: string) => byId.get(id);
};

export function profile(overrides: Partial<Profile> = {}): Profile {
  return {
    birthYear: 1998,
    birthMonth: 6,
    status: "none",
    menstruating: true,
    diet: "omnivore",
    allergens: [],
    timeZone: "America/Toronto",
    ...overrides,
  };
}

/** A reference date that makes the default profile 27 (band 19–30). */
export const ON = asLocalDate("2026-03-02");

let seq = 0;
export function entry(foodId: string, grams: number, date: string): LogEntry {
  return { id: `e${++seq}`, foodId, grams, logDate: asLocalDate(date) };
}
