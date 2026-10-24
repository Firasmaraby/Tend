// Nutrient catalogue. Units are what the library stores per 100 g.

export type Unit = "g" | "mg" | "µg";

/**
 * How a nutrient takes part in rounds.
 * - selectable: can be one of her three (still subject to the selectability floor)
 * - background: tracked and used for safety checks, never offered as a round
 * - blocked_policy: never offered by policy (vitamin D: food rarely gets her there)
 * - baseline: a daily foundation alongside her three (protein), never a round nutrient
 */
export type RoundPolicy = "selectable" | "background" | "blocked_policy" | "baseline";

export interface NutrientDef {
  code: NutrientCode;
  name: string;
  unit: Unit;
  roundPolicy: RoundPolicy;
}

export const NUTRIENT_CODES = [
  "iron",
  "calcium",
  "magnesium",
  "potassium",
  "fibre",
  "folate_dfe",
  "vit_b12",
  "vit_a_rae",
  "vit_c",
  "vit_k",
  "zinc",
  "choline",
  "ala",
  "epa_dha",
  "iodine",
  "vit_e",
  "selenium",
  "vit_b6",
  "thiamin",
  "riboflavin",
  "niacin",
  "phosphorus",
  "copper",
  "vit_d",
  "protein",
] as const;

export type NutrientCode = (typeof NUTRIENT_CODES)[number];

/**
 * Columns that are not targets themselves but separate a form that an upper
 * limit applies to. They exist because a combined column hides the
 * distinction (retinol inside RAE, folic acid inside DFE).
 */
export const FORM_CODES = ["retinol", "folic_acid"] as const;
export type FormCode = (typeof FORM_CODES)[number];

/** Context values: fat for fat-soluble vitamin advice; energy, carbs and fat for the opt-in macros line. */
export type ValueCode = NutrientCode | FormCode | "energy_kcal" | "fat" | "carbs";

const def = (code: NutrientCode, name: string, unit: Unit, roundPolicy: RoundPolicy): NutrientDef => ({
  code,
  name,
  unit,
  roundPolicy,
});

// Launch list of selectable nutrients is DECISIONS.md §Q5. Iodine and vitamin E
// are selectable in principle but only offered if they pass the data checks.
export const NUTRIENTS: Record<NutrientCode, NutrientDef> = {
  iron: def("iron", "Iron", "mg", "selectable"),
  calcium: def("calcium", "Calcium", "mg", "selectable"),
  magnesium: def("magnesium", "Magnesium", "mg", "selectable"),
  potassium: def("potassium", "Potassium", "mg", "selectable"),
  fibre: def("fibre", "Fibre", "g", "selectable"),
  folate_dfe: def("folate_dfe", "Folate", "µg", "selectable"),
  vit_b12: def("vit_b12", "Vitamin B12", "µg", "selectable"),
  vit_a_rae: def("vit_a_rae", "Vitamin A", "µg", "selectable"),
  vit_c: def("vit_c", "Vitamin C", "mg", "selectable"),
  vit_k: def("vit_k", "Vitamin K", "µg", "selectable"),
  zinc: def("zinc", "Zinc", "mg", "selectable"),
  choline: def("choline", "Choline", "mg", "selectable"),
  ala: def("ala", "Omega-3 (ALA, plant)", "g", "selectable"),
  epa_dha: def("epa_dha", "Omega-3 (EPA+DHA, marine)", "mg", "selectable"),
  iodine: def("iodine", "Iodine", "µg", "selectable"),
  vit_e: def("vit_e", "Vitamin E", "mg", "selectable"),
  selenium: def("selenium", "Selenium", "µg", "background"),
  vit_b6: def("vit_b6", "Vitamin B6", "mg", "background"),
  thiamin: def("thiamin", "Thiamin", "mg", "background"),
  riboflavin: def("riboflavin", "Riboflavin", "mg", "background"),
  niacin: def("niacin", "Niacin", "mg", "background"),
  phosphorus: def("phosphorus", "Phosphorus", "mg", "background"),
  copper: def("copper", "Copper", "µg", "background"),
  vit_d: def("vit_d", "Vitamin D", "µg", "blocked_policy"),
  protein: def("protein", "Protein", "g", "baseline"),
};
