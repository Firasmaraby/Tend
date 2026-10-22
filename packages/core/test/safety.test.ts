import { describe, expect, it } from "vitest";
import {
  ALLERGENS,
  allergenWarnings,
  allMarks,
  eligibleFoods,
  ineligibleReason,
  rank,
  servingGuard,
  weightsFromRoles,
  type Allergen,
  type Food,
} from "../src";
import { ALL_FIXTURES, beefLiver, brazilNuts, entry, food, fortifiedCereal, lookup, ON, oysters, peanutButter, profile, pumpkinSeeds, salmon, spinach, thyme } from "./fixtures";

const marks = allMarks(profile(), ON);
const lk = lookup();
const guard = (f: Food, today = [] as ReturnType<typeof entry>[]) => servingGuard(f, f.serving!.grams, marks, today, lk);

describe("allergens hard-filter every suggestion (v1 beta bug)", () => {
  // One food per allergen, plus an allergen-free food that should always survive.
  const tagged = ALLERGENS.map((a) => food(`contains_${a}`, "other", { iron: 5 }, 100, { allergens: [a] }));
  const safe = food("safe", "other", { iron: 5 }, 100);
  const pool = [...tagged, safe];

  it.each(ALLERGENS)("a profile allergic to %s never sees it in the pool or in ranking", (a: Allergen) => {
    const p = profile({ allergens: [a] });
    const eligible = eligibleFoods(pool, p);
    expect(eligible.some((f) => f.allergens!.includes(a))).toBe(false);
    expect(eligible.map((f) => f.id)).toContain("safe");
    const ranked = rank({ pool: eligible, marks, weights: { iron: 1 }, today: [], lookup: lookup(pool), mode: "serving" });
    expect(ranked.some((r) => r.food.allergens!.includes(a))).toBe(false);
  });

  it("untagged allergens are never assumed safe", () => {
    const untagged = food("mystery", "other", { iron: 5 }, 100, { allergens: null });
    expect(ineligibleReason(untagged, profile())).toBe("allergens_untagged");
  });

  it("search still finds it, labelled", () => {
    expect(allergenWarnings(peanutButter, profile({ allergens: ["peanut"] }))).toEqual(["peanut"]);
  });
});

describe("diet, curation and pregnancy filters", () => {
  it("diet: a vegetarian never gets fish; an omnivore can", () => {
    expect(ineligibleReason(salmon, profile({ diet: "vegetarian" }))).toBe("diet");
    expect(ineligibleReason(salmon, profile({ diet: "pescatarian" }))).toBeNull();
  });
  it("herbs and spices are searchable but never suggested", () => expect(ineligibleReason(thyme, profile())).toBe("never_suggest_category"));
  it("pregnancy excludes flagged foods and anything not yet reviewed", () => {
    const p = profile({ status: "pregnant", menstruating: false });
    expect(ineligibleReason(beefLiver, p)).toBe("pregnancy_safety");
    expect(ineligibleReason({ ...spinach, pregnancyFlags: null }, p)).toBe("pregnancy_untagged");
    expect(ineligibleReason(spinach, p)).toBeNull();
  });
  it("a fully-tagged pool only loses what it should", () => {
    const ids = eligibleFoods(ALL_FIXTURES, profile()).map((f) => f.id);
    expect(ids).not.toContain("thyme");
    expect(ids).toContain("beef_liver"); // eligible, but the UL guard removes it at ranking time
  });
});

describe("upper limits (EXPECTED_VALUES.md › Upper limits)", () => {
  it("Brazil nuts: 95.85% of the selenium UL → one serving a day", () => {
    expect(guard(brazilNuts)).toEqual({ kind: "capped", maxServingsPerDay: 1, nutrient: "selenium" });
    expect(guard(brazilNuts, [entry("brazil_nuts", 20, "2026-03-02")])).toMatchObject({ kind: "excluded" });
  });
  it("oysters: 167% of the zinc UL in one serving → excluded", () => {
    expect(guard(oysters)).toEqual({ kind: "excluded", nutrient: "zinc", reason: "serving_over_ul" });
  });
  it("liver: the retinol UL applies to preformed retinol → excluded", () => {
    expect(guard(beefLiver)).toEqual({ kind: "excluded", nutrient: "vit_a_rae", reason: "serving_over_ul" });
  });
  it("spinach: carotenoids have no UL → not limited", () => expect(guard(spinach)).toEqual({ kind: "ok" }));
  it("pumpkin seeds: the magnesium UL is for supplements → not limited", () => expect(guard(pumpkinSeeds)).toEqual({ kind: "ok" }));
  it("fortified cereal: 70% of the folic acid UL → one a day", () => {
    expect(guard(fortifiedCereal)).toMatchObject({ kind: "capped", nutrient: "folate_dfe" });
  });
  it("a day that would pass a UL excludes the food", () => {
    const zincy = food("zincy", "other", { zinc: 30 }, 100);
    const lk2 = lookup([zincy]);
    expect(servingGuard(zincy, 100, marks, [entry("zincy", 50, "2026-03-02")], lk2)).toMatchObject({ kind: "excluded", reason: "day_would_exceed_ul" });
  });
  it("a day already past one UL doesn't block foods that add none of it", () => {
    const lk2 = lookup([beefLiver, spinach]);
    const today = [entry("beef_liver", 85, "2026-03-02")];
    expect(servingGuard(spinach, 180, marks, today, lk2)).toEqual({ kind: "ok" });
  });
  it("ranking never returns an excluded food", () => {
    const pool = eligibleFoods(ALL_FIXTURES, profile());
    const ranked = rank({ pool, marks, weights: weightsFromRoles([{ nutrient: "zinc", role: "focus" }, { nutrient: "vit_a_rae", role: "focus" }]), today: [], lookup: lk, mode: "serving" });
    const ids = ranked.map((r) => r.food.id);
    expect(ids).not.toContain("oysters_eastern_cooked");
    expect(ids).not.toContain("beef_liver");
  });
});

describe("structural guarantee", () => {
  it("ranking only accepts a pool that went through the gate (checked by tsc)", () => {
    const unchecked = () =>
      // @ts-expect-error a raw food list can't be ranked; it must go through eligibleFoods first
      rank({ pool: ALL_FIXTURES, marks, weights: {}, today: [], lookup: lk, mode: "serving" });
    expect(typeof unchecked).toBe("function");
  });
});
