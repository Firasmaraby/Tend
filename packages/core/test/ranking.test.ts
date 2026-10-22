import { describe, expect, it } from "vitest";
import { allMarks, eligibleFoods, rank, roomLeft, scoreFood, selectabilityReport, floorStatus, weightsFromRoles } from "../src";
import { entry, food, iceberg, lentils, lookup, ON, profile, salmon } from "./fixtures";

const marks = allMarks(profile(), ON);
const focus = weightsFromRoles([
  { nutrient: "iron", role: "focus" },
  { nutrient: "calcium", role: "focus" },
  { nutrient: "fibre", role: "focus" },
]);
const lk = lookup();
const base = { marks, weights: focus, today: [], lookup: lk };

describe("score (EXPECTED_VALUES.md › Ranking)", () => {
  it("lentils on an empty day", () => {
    const r = scoreFood(lentils, base)!;
    const share = Object.fromEntries(r.contributions.map((c) => [c.nutrient, c.share]));
    expect(share.iron).toBeCloseTo(0.457875, 6);
    expect(share.calcium).toBeCloseTo(0.047025, 6);
    expect(share.fibre).toBeCloseTo(0.62568, 6);
    expect(r.score).toBeCloseTo(1.13058, 5);
    expect(r.servingKcal).toBeCloseTo(229.68, 6);
    expect(r.density).toBeCloseTo(0.0049224, 7);
  });

  it("gain stops at the mark", () => {
    // 12.96 mg iron today = 0.9 of 14.4
    const ironDay = food("iron_day", "other", { iron: 12.96 }, 100);
    const today = [entry("iron_day", 100, "2026-03-02")];
    const r = scoreFood(lentils, { ...base, today, lookup: lookup([lentils, ironDay]) })!;
    expect(r.contributions.find((c) => c.nutrient === "iron")!.gain).toBeCloseTo(0.1, 9);
  });

  it("the round so far counts: yesterday's salmon carries today", () => {
    expect(roomLeft(0, 3.0)).toBe(0);
    expect(roomLeft(0, 0.5)).toBe(0.75);
    expect(roomLeft(0.4, undefined)).toBeCloseTo(0.6);
    const r = scoreFood(salmon, { ...base, weights: { epa_dha: 1 }, roundMeanToDate: { epa_dha: 3 } })!;
    expect(r.score).toBe(0);
  });

  it("unknown values give no gain and are reported as unknown, not zero", () => {
    const r = scoreFood(salmon, base)!;
    expect(r.contributions.every((c) => c.share === undefined && c.gain === 0)).toBe(true);
  });
});

describe("density mode", () => {
  it("energy below 25 kcal uses the floor", () => {
    const r = scoreFood(iceberg, { ...base, weights: { vit_k: 1 } })!;
    expect(r.servingKcal).toBeCloseTo(10.08, 6);
    expect(r.density).toBeCloseTo(r.score / 25, 12);
  });
  it("skips foods with unknown energy and foods that barely contribute", () => {
    const noEnergy = food("no_energy", "legumes", { iron: 10 }, 100);
    const trace = food("trace", "vegetables", { iron: 0.5, energy_kcal: 5 }, 100);
    const pool = eligibleFoods([lentils, noEnergy, trace], profile());
    const ids = rank({ pool, ...base, lookup: lookup([lentils, noEnergy, trace]), mode: "density" }).map((r) => r.food.id);
    expect(ids).toEqual(["lentils_cooked"]);
  });
});

describe("diversity and duplicates", () => {
  it("a category is discounted after each pick, and duplicate groups appear once", () => {
    const greens = [1, 2, 3].map((i) => food(`green_${i}`, "leafy_greens", { iron: 5 - i * 0.1, energy_kcal: 20 }, 100));
    const bean = food("bean", "legumes", { iron: 4.3, energy_kcal: 120 }, 100);
    const twin = food("green_1_twin", "leafy_greens", { iron: 4.9, energy_kcal: 20 }, 100, { dupGroupId: "g1" });
    greens[0] = { ...greens[0]!, dupGroupId: "g1" };
    const all = [...greens, bean, twin];
    const ids = rank({ pool: eligibleFoods(all, profile()), ...base, weights: { iron: 1 }, lookup: lookup(all), mode: "serving" }).map((r) => r.food.id);
    // green_1 4.9; green_2 4.8×0.85=4.08; bean 4.3 → bean is second.
    expect(ids.slice(0, 2)).toEqual(["green_1", "bean"]);
    expect(ids.filter((id) => id === "green_1" || id === "green_1_twin")).toHaveLength(1);
  });
});

describe("selectability floor", () => {
  it("status thresholds", () => {
    expect([floorStatus(14), floorStatus(15), floorStatus(19), floorStatus(20)]).toEqual(["fail", "near", "near", "pass"]);
  });
  it("counts foods at ≥15% of the mark per serving, after the diet filter", () => {
    // 15 foods just over 15% of the iron mark (2.16 mg), 1 just under, 5 fish that a vegan can't have.
    const at15 = Array.from({ length: 15 }, (_, i) => food(`iron_${i}`, "legumes", { iron: 2.2 }, 100));
    const below = food("iron_low", "legumes", { iron: 2.1 }, 100);
    const fish = Array.from({ length: 5 }, (_, i) => food(`fish_${i}`, "fish", { iron: 5 }, 100, { diet: "pescatarian" }));
    const foods = [...at15, below, ...fish];
    const iron = (diet: "vegan" | "omnivore") => selectabilityReport(foods, marks, profile({ diet })).find((r) => r.nutrient === "iron")!;
    expect(iron("vegan")).toMatchObject({ qualifying: 15, status: "near", selectable: true });
    expect(iron("omnivore")).toMatchObject({ qualifying: 20, status: "pass" });
    expect(selectabilityReport(foods, marks, profile()).find((r) => r.nutrient === "calcium")).toMatchObject({ qualifying: 0, status: "fail", selectable: false });
  });
});
