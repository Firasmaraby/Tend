import { describe, expect, it } from "vitest";
import {
  addDays,
  asLocalDate,
  closeRound,
  coverage,
  isDrifting,
  nutrientResult,
  roundEndsOn,
  totalFor,
  type LogEntry,
  type NutrientRoundResult,
} from "../src";
import { entry, food, lentils, lookup, salmon } from "./fixtures";

const start = asLocalDate("2026-03-02");
const round = { startedOn: start, endsOn: roundEndsOn(start) };

// A probe food with 1 mg iron per gram: logging N grams gives N/mark coverage.
const probe = food("probe", "other", { iron: 100 }, 100);
const unknownProbe = food("probe_unknown", "other", {}, 100);
const lk = lookup([probe, unknownProbe, salmon]);
const MARK = 10;

/** One entry per day on the first `days.length` days of the round, at the given coverage. */
function days(...coverages: number[]): LogEntry[] {
  return coverages.map((c, i) => entry("probe", c * MARK, addDays(start, i)));
}
const repeat = (n: number, c: number) => Array<number>(n).fill(c);
const result = (entries: LogEntry[]) => nutrientResult("iron", "focus", MARK, round, entries, lk);

describe("coverage", () => {
  it("salmon EPA+DHA is 480.8% (never 601%)", () => {
    const t = totalFor([entry("salmon", 100, "2026-03-02")], "epa_dha", lk);
    expect(coverage(t, 250)).toBeCloseTo(4.808, 10);
  });
  it("unclamped: 300% counts as 3.0", () => expect(result(days(3)).meanLogged).toBe(3));
  it("NULL is never zero: 'at least' with a flag", () => {
    const t = totalFor([entry("probe", 5, "2026-03-02"), entry("probe_unknown", 100, "2026-03-02")], "iron", lk);
    expect(t).toEqual({ known: 5, unknownEntries: 1, entries: 2, hasUnknown: true });
  });
});

describe("round verdict (EXPECTED_VALUES.md › Round verdicts)", () => {
  it("30 of 42 days at 100%: reached (v1 would have said 71.4%, a miss)", () => {
    const r = result(days(...repeat(30, 1)));
    expect(r).toMatchObject({ outcome: "reached", meanLogged: 1, loggedDays: 30, totalDays: 42 });
  });
  it("21 logged days is enough for a verdict", () => expect(result(days(...repeat(21, 1))).outcome).toBe("reached"));
  it("20 logged days at 300% is not enough data", () => {
    expect(result(days(...repeat(20, 3)))).toMatchObject({ outcome: "not_enough_data", noDataReason: "low_logging" });
  });
  it("10 at 0.5 and 11 at 1.2: missed at 0.8667", () => {
    const r = result(days(...repeat(10, 0.5), ...repeat(11, 1.2)));
    expect(r.outcome).toBe("missed");
    expect(r.meanLogged).toBeCloseTo(0.866667, 6);
  });
  it("20 at 0.9 and one at 3.0: reached, unclamped, with float tolerance", () => {
    const r = result(days(...repeat(20, 0.9), 3));
    expect(r.outcome).toBe("reached");
  });
  it("a gap in the data is not her gap", () => {
    // 25 days; 10 of them add an unknown-iron serving: 10 / 35 servings = 28.6%, still judged.
    const base = days(...repeat(25, 1));
    const some = [...base, ...Array.from({ length: 10 }, (_, i) => entry("probe_unknown", 100, addDays(start, i)))];
    expect(result(some).outcome).toBe("reached");
    // An unknown-iron serving on all 25 days: 25 unknown of 50 servings = 50%.
    const many = [...base, ...Array.from({ length: 25 }, (_, i) => entry("probe_unknown", 100, addDays(start, i)))];
    expect(result(many)).toMatchObject({ outcome: "not_enough_data", noDataReason: "data_gap" });
  });
  it("days outside the window don't count", () => {
    const r = result([...days(...repeat(21, 1)), entry("probe", 1000, "2026-04-13")]);
    expect(r.meanLogged).toBe(1);
  });
  it("weekly logged-day means for the trajectory", () => {
    const r = result(days(...repeat(7, 0.4), ...repeat(7, 0.8)));
    expect(r.weekly[0]).toBeCloseTo(0.4, 12);
    expect(r.weekly[1]).toBeCloseTo(0.8, 12);
    expect(r.weekly[2]).toBeNull();
  });
});

describe("closeRound", () => {
  const res = (nutrient: NutrientRoundResult["nutrient"], role: NutrientRoundResult["role"], meanLogged: number, outcome?: NutrientRoundResult["outcome"]): NutrientRoundResult => ({
    nutrient,
    role,
    meanLogged,
    loggedDays: 30,
    totalDays: 42,
    weekly: [],
    unknownShare: 0,
    outcome: outcome ?? (meanLogged >= 1 ? "reached" : "missed"),
  });

  it("the lowest miss carries; the rest lock in", () => {
    const c = closeRound([res("iron", "focus", 0.62), res("calcium", "focus", 0.95), res("fibre", "focus", 1.1)]);
    expect({ ...c, locked: c.locked.sort() }).toEqual({ lowData: false, carried: "iron", locked: ["calcium", "fibre"], projects: [], released: [] });
  });

  it("a second miss in a row becomes a longer project; the next miss carries", () => {
    const c = closeRound([res("iron", "carried", 0.7), res("calcium", "focus", 0.9), res("zinc", "focus", 1.2), res("fibre", "locked", 1.3)]);
    expect(c.carried).toBe("calcium");
    expect(c.projects).toEqual(["iron"]);
    expect(c.locked.sort()).toEqual(["fibre", "zinc"]);
  });

  it("a project that reaches its mark locks in", () => {
    const c = closeRound([res("vit_b12", "project", 1.05)]);
    expect(c.locked).toEqual(["vit_b12"]);
    expect(c.projects).toEqual([]);
  });

  it("low data: no carry, nothing new locks, the three are released", () => {
    const low = (n: NutrientRoundResult["nutrient"]) => ({ ...res(n, "focus", 0.3, "not_enough_data"), noDataReason: "low_logging" as const, loggedDays: 12 });
    const c = closeRound([low("iron"), low("calcium"), low("fibre"), res("zinc", "locked", 1)]);
    expect(c).toEqual({ lowData: true, carried: null, locked: ["zinc"], projects: [], released: ["iron", "calcium", "fibre"] });
  });
});

describe("drift on locked-in nutrients", () => {
  it("three weeks under the mark", () => expect(isDrifting([1.2, 0.9, 0.8, 0.7])).toBe(true));
  it("not if any recent week reached it", () => expect(isDrifting([0.9, 1.0, 0.8])).toBe(false));
  it("not on thin data", () => expect(isDrifting([0.5, null, 0.5])).toBe(false));
});

describe("contributors", () => {
  it("which foods carried a nutrient, by share of the known total", async () => {
    const { contributorsFor } = await import("../src");
    const es = [entry("probe", 30, "2026-03-02"), entry("probe", 10, "2026-03-03"), entry("probe_unknown", 100, "2026-03-03"), entry("salmon", 100, "2026-03-03")];
    // probe: 1 mg iron per gram → 40 mg total; unknown and salmon (no iron value) add nothing.
    expect(contributorsFor(es, "iron", lk)).toEqual([{ foodId: "probe", amount: 40, share: 1 }]);
    // Probe 30 mg vs lentils 6.5934 mg (198 g × 3.33/100): shares 0.81982 and 0.18018.
    const lk2 = (id: string) => (id === "lentils_cooked" ? lentils : lk(id));
    const two = contributorsFor([entry("probe", 30, "2026-03-02"), entry("lentils_cooked", 198, "2026-03-03")], "iron", lk2);
    expect(two.map((c) => c.foodId)).toEqual(["probe", "lentils_cooked"]);
    expect(two[0]!.share).toBeCloseTo(0.81982, 5);
    expect(two[1]!.share).toBeCloseTo(0.18018, 5);
  });
});
