import { describe, expect, it } from "vitest";
import { adviceNutrients, allMarks, asLocalDate, isPeriodDay, periodDay, periodEndsOn, withPeriodWeights } from "../src";
import { ON, profile } from "./fixtures";

const d = asLocalDate;
const period = { startedOn: d("2026-03-02"), lengthDays: 5 };

describe("period timing", () => {
  it("inclusive window: day 1 to day 5", () => {
    expect(periodEndsOn(period)).toBe("2026-03-06");
    expect(isPeriodDay(profile(), period, d("2026-03-06"))).toBe(true);
    expect(isPeriodDay(profile(), period, d("2026-03-07"))).toBe(false);
    expect(periodDay(period, d("2026-03-03"))).toBe(2);
  });
  it("ending early or late is respected", () => {
    expect(isPeriodDay(profile(), { ...period, endedOn: d("2026-03-03") }, d("2026-03-04"))).toBe(false);
  });
  it("never applies when not menstruating or pregnant", () => {
    expect(isPeriodDay(profile({ menstruating: false }), period, d("2026-03-03"))).toBe(false);
    expect(isPeriodDay(profile({ status: "pregnant" }), period, d("2026-03-03"))).toBe(false);
  });
  it("boosts iron in suggestions, adds iron to advice, never changes the mark", () => {
    expect(withPeriodWeights({ iron: 1, calcium: 1 }, true)).toEqual({ iron: 1.5, calcium: 1 });
    expect(withPeriodWeights({ calcium: 1 }, true)).toEqual({ calcium: 1, iron: 0.6 });
    expect(withPeriodWeights({ calcium: 1 }, false)).toEqual({ calcium: 1 });
    expect(adviceNutrients(["calcium"], true)).toEqual(["calcium", "iron"]);
    expect(allMarks(profile(), ON).iron.value).toBe(14.4);
  });
});
