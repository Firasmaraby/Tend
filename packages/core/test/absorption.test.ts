import { describe, expect, it } from "vitest";
import { allMarks, eligibleFoods, helperFoods, isHelper, isTarget, pairingFor, pairingsToday } from "../src";
import { entry, food, lentils, lookup, ON, profile, salmon, spinach } from "./fixtures";

const marks = allMarks(profile(), ON);
const pepper = food("red_pepper", "vegetables", { vit_c: 127.7, iron: 0.43, fat: 0.3 }, 149, { form: "raw" });
const oil = food("olive_oil", "oils_fats", { fat: 100 }, 14);
const kale = food("kale_cooked", "leafy_greens", { vit_k: 418.5, calcium: 150, fat: 0.5 }, 130);
const chard = food("chard_cooked", "leafy_greens", { calcium: 58, vit_k: 327 }, 175, { traits: ["high_oxalate"] });
const steak = food("steak", "meat", { iron: 2.78 }, 100, { diet: "omnivore" });
const all = [lentils, salmon, spinach, pepper, oil, kale, chard, steak];
const lk = lookup(all);

describe("iron and vitamin C", () => {
  it("plant iron is a target, animal iron is not", () => {
    expect(isTarget("iron_vitamin_c", lentils, 198, marks)).toBe(true); // 45.8% of the mark, non-heme
    expect(isTarget("iron_vitamin_c", steak, 100, marks)).toBe(false);
  });
  it("25 mg vitamin C or meat helps; a cup of red pepper has 190 mg", () => {
    expect(isHelper("iron_vitamin_c", pepper, 149)).toBe(true);
    expect(isHelper("iron_vitamin_c", steak, 100)).toBe(true);
    expect(isHelper("iron_vitamin_c", lentils, 198)).toBe(false);
  });
  it("notices an unpaired day, then celebrates the pairing", () => {
    const before = pairingsToday([entry("lentils_cooked", 198, "2026-03-02")], lk, marks, ["iron"]);
    expect(before).toEqual([{ rule: "iron_vitamin_c", target: lentils, paired: false }]);
    const after = pairingsToday([entry("lentils_cooked", 198, "2026-03-02"), entry("red_pepper", 149, "2026-03-02")], lk, marks, ["iron"]);
    expect(after[0]).toMatchObject({ paired: true, helper: pepper });
  });
  it("only for nutrients that are hers", () => {
    expect(pairingsToday([entry("lentils_cooked", 198, "2026-03-02")], lk, marks, ["calcium"])).toEqual([]);
  });
  it("suggestion rows and helper lists (plant helpers only)", () => {
    expect(pairingFor(lentils, marks, ["iron"])).toBe("iron_vitamin_c");
    expect(pairingFor(salmon, marks, ["iron"])).toBeNull();
    expect(helperFoods("iron_vitamin_c", eligibleFoods(all, profile())).map((f) => f.id)).toEqual(["red_pepper"]);
  });
});

describe("fat-soluble vitamins", () => {
  it("leafy greens rich in vitamin K want some fat", () => {
    expect(isTarget("fat_soluble", kale, 130, marks)).toBe(true);
    expect(isHelper("fat_soluble", oil, 14)).toBe(true);
    const day = [entry("kale_cooked", 130, "2026-03-02"), entry("olive_oil", 14, "2026-03-02")];
    expect(pairingsToday(day, lk, marks, ["vit_k"])[0]).toMatchObject({ rule: "fat_soluble", paired: true });
  });
});

describe("calcium and oxalate", () => {
  it("is a know-rule: teaches, has no helpers", () => {
    const m = pairingsToday([entry("chard_cooked", 175, "2026-03-02")], lk, marks, ["calcium"]);
    expect(m).toEqual([{ rule: "calcium_oxalate", target: chard, paired: false }]);
    expect(pairingFor(chard, marks, ["calcium"])).toBeNull();
  });
});

describe("protein baseline mark", () => {
  it("flat 75 g, or 1.2 g/kg with an opt-in weight", () => {
    expect(marks.protein.value).toBe(75);
    expect(allMarks(profile({ weightKg: 65 }), ON).protein.value).toBeCloseTo(78);
  });
});

describe("meals", () => {
  it("defaults from her clock", async () => {
    const { defaultMeal } = await import("../src");
    expect([defaultMeal(7), defaultMeal(10, 30), defaultMeal(12), defaultMeal(15), defaultMeal(19), defaultMeal(23)]).toEqual([
      "breakfast", "lunch", "lunch", "snack", "dinner", "snack",
    ]);
  });
  it("tagged meals: the pairing has to be in the same meal", () => {
    const at = (id: string, g: number, meal: "breakfast" | "dinner") => ({ ...entry(id, g, "2026-03-02"), meal });
    const apart = pairingsToday([at("lentils_cooked", 198, "dinner"), at("red_pepper", 149, "breakfast")], lk, marks, ["iron"]);
    expect(apart[0]).toMatchObject({ paired: false, meal: "dinner" });
    const together = pairingsToday([at("lentils_cooked", 198, "dinner"), at("red_pepper", 149, "dinner")], lk, marks, ["iron"]);
    expect(together[0]).toMatchObject({ paired: true });
  });
});

describe("spinach is not ranked as a calcium source", () => {
  it("counts in totals, but gives no calcium gain in ranking", async () => {
    const { scoreFood } = await import("../src");
    const r = scoreFood(chard, { marks, weights: { calcium: 1 }, today: [], lookup: lk })!;
    expect(r.score).toBe(0);
    expect(r.contributions[0]).toMatchObject({ nutrient: "calcium", poorlyAbsorbed: true });
    expect(r.contributions[0]!.share).toBeGreaterThan(0.12);
  });
});
