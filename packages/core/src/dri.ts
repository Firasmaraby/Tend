// Dietary Reference Intakes for women. Source: National Academies (NASEM)
// DRI tables, with potassium from the 2019 revision. EPA+DHA is not a NASEM
// value: 250 mg is EFSA's adult reference, and 350 mg for pregnancy and
// lactation is DECISIONS.md §11 (EFSA 250 + the lower end of its +100 to 200 mg DHA).
//
// The mark is never stored here. targets.ts derives it from `basis`.

import type { NutrientCode } from "./nutrients";

export type BandKey =
  | "f19_30"
  | "f31_50"
  | "f51_70"
  | "f71"
  | "preg19_30"
  | "preg31_50"
  | "lact19_30"
  | "lact31_50";

export const BAND_KEYS: readonly BandKey[] = [
  "f19_30",
  "f31_50",
  "f51_70",
  "f71",
  "preg19_30",
  "preg31_50",
  "lact19_30",
  "lact31_50",
];

export type Basis = "RDA" | "AI" | "FIXED";

/**
 * Which intake an upper limit is about. Applying a supplemental-only UL to
 * food is a food-science error (magnesium from pumpkin seeds is not a risk).
 */
export type UlAppliesTo =
  | "total"
  | "preformed_retinol"
  | "folic_acid"
  | "supplemental_only"
  | "none";

export interface DriValues {
  rda?: number;
  ear?: number;
  ai?: number;
  fixed?: number;
  ul?: number;
}

export interface NutrientDri {
  basis: Basis;
  ulAppliesTo: UlAppliesTo;
  bands: Record<BandKey, DriValues>;
}

const same = (v: DriValues): Record<BandKey, DriValues> => ({
  f19_30: v,
  f31_50: v,
  f51_70: v,
  f71: v,
  preg19_30: v,
  preg31_50: v,
  lact19_30: v,
  lact31_50: v,
});

const byStage = (
  adult19_30: DriValues,
  adult31_50: DriValues,
  adult51_70: DriValues,
  adult71: DriValues,
  preg19_30: DriValues,
  preg31_50: DriValues,
  lact19_30: DriValues,
  lact31_50: DriValues,
): Record<BandKey, DriValues> => ({
  f19_30: adult19_30,
  f31_50: adult31_50,
  f51_70: adult51_70,
  f71: adult71,
  preg19_30,
  preg31_50,
  lact19_30,
  lact31_50,
});

/** Same values for every adult age band, then pregnancy, then lactation. */
const stage = (adult: DriValues, preg: DriValues, lact: DriValues) =>
  byStage(adult, adult, adult, adult, preg, preg, lact, lact);

export const DRI: Record<NutrientCode, NutrientDri> = {
  iron: {
    basis: "RDA",
    ulAppliesTo: "total",
    bands: byStage(
      { rda: 18, ear: 8.1, ul: 45 },
      { rda: 18, ear: 8.1, ul: 45 },
      { rda: 8, ear: 5, ul: 45 },
      { rda: 8, ear: 5, ul: 45 },
      { rda: 27, ear: 22, ul: 45 },
      { rda: 27, ear: 22, ul: 45 },
      // Lactation values assume menses have not returned (see DRI_MODIFIERS).
      { rda: 9, ear: 6.5, ul: 45 },
      { rda: 9, ear: 6.5, ul: 45 },
    ),
  },
  calcium: {
    basis: "RDA",
    ulAppliesTo: "total",
    bands: byStage(
      { rda: 1000, ear: 800, ul: 2500 },
      { rda: 1000, ear: 800, ul: 2500 },
      { rda: 1200, ear: 1000, ul: 2000 },
      { rda: 1200, ear: 1000, ul: 2000 },
      { rda: 1000, ear: 800, ul: 2500 },
      { rda: 1000, ear: 800, ul: 2500 },
      { rda: 1000, ear: 800, ul: 2500 },
      { rda: 1000, ear: 800, ul: 2500 },
    ),
  },
  magnesium: {
    basis: "RDA",
    ulAppliesTo: "supplemental_only",
    bands: byStage(
      { rda: 310, ear: 255, ul: 350 },
      { rda: 320, ear: 265, ul: 350 },
      { rda: 320, ear: 265, ul: 350 },
      { rda: 320, ear: 265, ul: 350 },
      { rda: 350, ear: 290, ul: 350 },
      { rda: 360, ear: 300, ul: 350 },
      { rda: 310, ear: 255, ul: 350 },
      { rda: 320, ear: 265, ul: 350 },
    ),
  },
  potassium: {
    basis: "AI",
    ulAppliesTo: "none",
    bands: stage({ ai: 2600 }, { ai: 2900 }, { ai: 2800 }),
  },
  fibre: {
    basis: "AI",
    ulAppliesTo: "none",
    bands: byStage({ ai: 25 }, { ai: 25 }, { ai: 21 }, { ai: 21 }, { ai: 28 }, { ai: 28 }, { ai: 29 }, { ai: 29 }),
  },
  folate_dfe: {
    basis: "RDA",
    ulAppliesTo: "folic_acid",
    bands: stage({ rda: 400, ear: 320, ul: 1000 }, { rda: 600, ear: 520, ul: 1000 }, { rda: 500, ear: 450, ul: 1000 }),
  },
  vit_b12: {
    basis: "RDA",
    ulAppliesTo: "none",
    bands: stage({ rda: 2.4, ear: 2.0 }, { rda: 2.6, ear: 2.2 }, { rda: 2.8, ear: 2.4 }),
  },
  vit_a_rae: {
    basis: "RDA",
    ulAppliesTo: "preformed_retinol",
    bands: stage({ rda: 700, ear: 500, ul: 3000 }, { rda: 770, ear: 550, ul: 3000 }, { rda: 1300, ear: 900, ul: 3000 }),
  },
  vit_c: {
    basis: "RDA",
    ulAppliesTo: "total",
    bands: stage({ rda: 75, ear: 60, ul: 2000 }, { rda: 85, ear: 70, ul: 2000 }, { rda: 120, ear: 100, ul: 2000 }),
  },
  vit_k: {
    basis: "AI",
    ulAppliesTo: "none",
    bands: same({ ai: 90 }),
  },
  zinc: {
    basis: "RDA",
    ulAppliesTo: "total",
    bands: stage({ rda: 8, ear: 6.8, ul: 40 }, { rda: 11, ear: 9.5, ul: 40 }, { rda: 12, ear: 10.4, ul: 40 }),
  },
  choline: {
    basis: "AI",
    ulAppliesTo: "total",
    bands: stage({ ai: 425, ul: 3500 }, { ai: 450, ul: 3500 }, { ai: 550, ul: 3500 }),
  },
  ala: {
    basis: "AI",
    ulAppliesTo: "none",
    bands: stage({ ai: 1.1 }, { ai: 1.4 }, { ai: 1.3 }),
  },
  epa_dha: {
    basis: "FIXED",
    ulAppliesTo: "none",
    bands: stage({ fixed: 250 }, { fixed: 350 }, { fixed: 350 }),
  },
  iodine: {
    basis: "RDA",
    ulAppliesTo: "total",
    bands: stage({ rda: 150, ear: 95, ul: 1100 }, { rda: 220, ear: 160, ul: 1100 }, { rda: 290, ear: 209, ul: 1100 }),
  },
  vit_e: {
    basis: "RDA",
    ulAppliesTo: "supplemental_only",
    bands: stage({ rda: 15, ear: 12, ul: 1000 }, { rda: 15, ear: 12, ul: 1000 }, { rda: 19, ear: 16, ul: 1000 }),
  },
  selenium: {
    basis: "RDA",
    ulAppliesTo: "total",
    bands: stage({ rda: 55, ear: 45, ul: 400 }, { rda: 60, ear: 49, ul: 400 }, { rda: 70, ear: 59, ul: 400 }),
  },
  vit_b6: {
    basis: "RDA",
    ulAppliesTo: "total",
    bands: byStage(
      { rda: 1.3, ear: 1.1, ul: 100 },
      { rda: 1.3, ear: 1.1, ul: 100 },
      { rda: 1.5, ear: 1.3, ul: 100 },
      { rda: 1.5, ear: 1.3, ul: 100 },
      { rda: 1.9, ear: 1.6, ul: 100 },
      { rda: 1.9, ear: 1.6, ul: 100 },
      { rda: 2.0, ear: 1.7, ul: 100 },
      { rda: 2.0, ear: 1.7, ul: 100 },
    ),
  },
  thiamin: {
    basis: "RDA",
    ulAppliesTo: "none",
    bands: stage({ rda: 1.1, ear: 0.9 }, { rda: 1.4, ear: 1.2 }, { rda: 1.4, ear: 1.2 }),
  },
  riboflavin: {
    basis: "RDA",
    ulAppliesTo: "none",
    bands: stage({ rda: 1.1, ear: 0.9 }, { rda: 1.4, ear: 1.2 }, { rda: 1.6, ear: 1.3 }),
  },
  niacin: {
    // UL applies to synthetic niacin; the library has no separate column, so
    // no food-based guard is possible and none is applied.
    basis: "RDA",
    ulAppliesTo: "supplemental_only",
    bands: stage({ rda: 14, ear: 11, ul: 35 }, { rda: 18, ear: 14, ul: 35 }, { rda: 17, ear: 13, ul: 35 }),
  },
  phosphorus: {
    basis: "RDA",
    ulAppliesTo: "total",
    bands: byStage(
      { rda: 700, ear: 580, ul: 4000 },
      { rda: 700, ear: 580, ul: 4000 },
      { rda: 700, ear: 580, ul: 4000 },
      { rda: 700, ear: 580, ul: 3000 },
      { rda: 700, ear: 580, ul: 3500 },
      { rda: 700, ear: 580, ul: 3500 },
      { rda: 700, ear: 580, ul: 4000 },
      { rda: 700, ear: 580, ul: 4000 },
    ),
  },
  copper: {
    basis: "RDA",
    ulAppliesTo: "total",
    bands: stage({ rda: 900, ear: 700, ul: 10000 }, { rda: 1000, ear: 800, ul: 10000 }, { rda: 1300, ear: 1000, ul: 10000 }),
  },
  protein: {
    // Placeholder only: the protein mark comes from the profile (proteinBaselineG),
    // 1.2 g/kg when she shares a weight, otherwise a flat 75 g. See targets.ts.
    basis: "FIXED",
    ulAppliesTo: "none",
    bands: same({ fixed: 75 }),
  },
  vit_d: {
    basis: "RDA",
    ulAppliesTo: "total",
    bands: byStage(
      { rda: 15, ear: 10, ul: 100 },
      { rda: 15, ear: 10, ul: 100 },
      { rda: 15, ear: 10, ul: 100 },
      { rda: 20, ear: 10, ul: 100 },
      { rda: 15, ear: 10, ul: 100 },
      { rda: 15, ear: 10, ul: 100 },
      { rda: 15, ear: 10, ul: 100 },
      { rda: 15, ear: 10, ul: 100 },
    ),
  },
};

export type PhysiologicalStatus = "none" | "pregnant" | "lactating";

/**
 * Context modifiers replace specific DRI values without moving her to another
 * band. This is the fix for v1 mapping "not menstruating" onto the 51+ band,
 * and the hook for future context such as heavy periods (feature-flagged).
 */
export interface DriModifier {
  id: string;
  nutrient: NutrientCode;
  when: { menstruating?: boolean; status?: readonly PhysiologicalStatus[] };
  values: DriValues;
  note: string;
}

export const DRI_MODIFIERS: readonly DriModifier[] = [
  {
    id: "iron_not_menstruating",
    nutrient: "iron",
    when: { menstruating: false, status: ["none"] },
    values: { rda: 8, ear: 5, ul: 45 },
    note: "No menstrual losses: the DRI value for women 51+, which is based on no menses, applies at any age.",
  },
  {
    id: "iron_menstruating",
    nutrient: "iron",
    when: { menstruating: true, status: ["none", "lactating"] },
    values: { rda: 18, ear: 8.1, ul: 45 },
    note: "Menstruating at any age (including 51+, and after menses return while breastfeeding; the lactation RDA assumes no menses).",
  },
];
