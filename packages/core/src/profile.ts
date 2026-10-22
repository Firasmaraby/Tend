import type { LocalDate } from "./dates";
import type { BandKey, PhysiologicalStatus } from "./dri";

export const DIET_PATTERNS = ["vegan", "vegetarian", "pescatarian", "omnivore"] as const;
export type DietPattern = (typeof DIET_PATTERNS)[number];

// Health Canada's priority food allergens (a superset of the US major nine),
// plus gluten as its own entry because Canada lists gluten sources.
export const ALLERGENS = [
  "peanut",
  "tree_nut",
  "sesame",
  "milk",
  "egg",
  "fish",
  "crustacean",
  "mollusc",
  "soy",
  "wheat",
  "gluten",
  "mustard",
  "sulphite",
] as const;
export type Allergen = (typeof ALLERGENS)[number];

export interface Profile {
  birthYear: number;
  /** 1 to 12. Year and month only: we never store a full date of birth. */
  birthMonth: number;
  status: PhysiologicalStatus;
  menstruating: boolean;
  diet: DietPattern;
  allergens: readonly Allergen[];
  /** IANA zone, e.g. "America/Toronto". */
  timeZone: string;
  /** Opt-in. Absent means protein uses the flat baseline. */
  weightKg?: number;
  /** 0.8 to 2.2, default 1.2. */
  proteinGPerKg?: number;
}

export const MIN_AGE = 18;

export class IneligibleProfileError extends Error {}

/**
 * Age on a date. Without a birth day we assume the birthday falls late in its
 * month, so in the birth month we count the younger age. That is conservative
 * for the 18+ gate and off by at most one month for band edges.
 */
export function ageOn(profile: Pick<Profile, "birthYear" | "birthMonth">, on: LocalDate): number {
  const [y, m] = on.split("-").map(Number) as [number, number];
  return y - profile.birthYear - (m <= profile.birthMonth ? 1 : 0);
}

/** DECISIONS.md §11: DRI age bands exactly, and an 18-year-old uses 19–30. */
export function bandFor(profile: Profile, on: LocalDate): BandKey {
  const age = ageOn(profile, on);
  if (age < MIN_AGE) throw new IneligibleProfileError(`Must be ${MIN_AGE} or older`);
  const young = age <= 30;
  switch (profile.status) {
    case "pregnant":
      // Pregnancy after 50 is rare; the 31–50 pregnancy values are the closest DRI.
      return young ? "preg19_30" : "preg31_50";
    case "lactating":
      return young ? "lact19_30" : "lact31_50";
    case "none":
      if (young) return "f19_30";
      if (age <= 50) return "f31_50";
      if (age <= 70) return "f51_70";
      return "f71";
  }
}

export const PROTEIN_DEFAULT_G_PER_KG = 1.2;
export const PROTEIN_FLAT_G = 75;

/** Protein is a background baseline, not a round nutrient. */
export function proteinBaselineG(profile: Profile): number {
  if (profile.weightKg === undefined) return PROTEIN_FLAT_G;
  const perKg = Math.min(2.2, Math.max(0.8, profile.proteinGPerKg ?? PROTEIN_DEFAULT_G_PER_KG));
  return profile.weightKg * perKg;
}
