import type { LocalDate } from "./dates";
import { DRI, DRI_MODIFIERS, type Basis, type BandKey, type DriValues, type UlAppliesTo } from "./dri";
import { NUTRIENT_CODES, type NutrientCode } from "./nutrients";
import { bandFor, proteinBaselineG, type Profile } from "./profile";

export interface Mark {
  nutrient: NutrientCode;
  value: number;
  basis: Basis;
  band: BandKey;
  /** Modifier ids that changed the reference values, for explainers and audits. */
  modifiers: string[];
  ul?: number;
  ulAppliesTo: UlAppliesTo;
}

/** Reference values for one nutrient after context modifiers. */
export function referenceValues(nutrient: NutrientCode, profile: Profile, band: BandKey) {
  let values: DriValues = DRI[nutrient].bands[band];
  const applied: string[] = [];
  for (const mod of DRI_MODIFIERS) {
    if (mod.nutrient !== nutrient) continue;
    if (mod.when.menstruating !== undefined && mod.when.menstruating !== profile.menstruating) continue;
    if (mod.when.status && !mod.when.status.includes(profile.status)) continue;
    values = { ...values, ...mod.values };
    applied.push(mod.id);
  }
  return { values, modifiers: applied };
}

/**
 * The mark (DECISIONS.md §2). The rule reads the basis from data, never from
 * a list of nutrient names:
 *   RDA   → max(EAR, 0.8 × RDA)  never below the average requirement
 *   AI    → AI × 1.0             no safety padding to remove
 *   FIXED → value as is          (EPA+DHA) the 0.8 never applies
 */
export function markFromValues(basis: Basis, v: DriValues): number {
  switch (basis) {
    case "RDA": {
      if (v.rda === undefined) throw new Error("RDA basis without an RDA value");
      const scaled = round6(0.8 * v.rda);
      return v.ear === undefined ? scaled : Math.max(v.ear, scaled);
    }
    case "AI":
      if (v.ai === undefined) throw new Error("AI basis without an AI value");
      return v.ai;
    case "FIXED":
      if (v.fixed === undefined) throw new Error("FIXED basis without a value");
      return v.fixed;
  }
}

export function markFor(nutrient: NutrientCode, profile: Profile, on: LocalDate): Mark {
  const band = bandFor(profile, on);
  const dri = DRI[nutrient];
  const { values, modifiers } = referenceValues(nutrient, profile, band);
  const mark: Mark = {
    nutrient,
    value: nutrient === "protein" ? proteinBaselineG(profile) : markFromValues(dri.basis, values),
    basis: dri.basis,
    band,
    modifiers,
    ulAppliesTo: dri.ulAppliesTo,
  };
  if (values.ul !== undefined) mark.ul = values.ul;
  return mark;
}

export type Marks = Record<NutrientCode, Mark>;

export function allMarks(profile: Profile, on: LocalDate): Marks {
  return Object.fromEntries(NUTRIENT_CODES.map((n) => [n, markFor(n, profile, on)])) as Marks;
}

/** Removes float noise such as 0.8 × 18 = 14.400000000000002. */
function round6(x: number): number {
  return Math.round(x * 1e6) / 1e6;
}
