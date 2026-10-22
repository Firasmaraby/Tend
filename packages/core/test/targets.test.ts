import { describe, expect, it } from "vitest";
import { allMarks, bandFor, IneligibleProfileError, markFor, markFromValues, proteinBaselineG, type NutrientCode } from "../src";
import { ON, profile } from "./fixtures";

const mark = (n: NutrientCode, p = profile()) => markFor(n, p, ON).value;

describe("mark rule (EXPECTED_VALUES.md › Marks)", () => {
  it("woman 19–30, menstruating: full table", () => {
    const expected: Partial<Record<NutrientCode, number>> = {
      iron: 14.4,
      calcium: 800,
      magnesium: 255,
      potassium: 2600,
      fibre: 25,
      folate_dfe: 320,
      vit_b12: 2.0,
      vit_a_rae: 560,
      vit_c: 60,
      vit_k: 90,
      zinc: 6.8,
      choline: 425,
      ala: 1.1,
      epa_dha: 250,
      iodine: 120,
      vit_e: 12,
      selenium: 45,
    };
    const marks = allMarks(profile(), ON);
    for (const [n, v] of Object.entries(expected)) expect(marks[n as NutrientCode].value, n).toBe(v);
  });

  it("EPA+DHA is fixed: the 0.8 never applies", () => {
    expect(markFromValues("FIXED", { fixed: 250 })).toBe(250);
    expect(mark("epa_dha")).toBe(250);
  });

  it("AI nutrients stay at 100%", () => {
    expect([mark("vit_k"), mark("potassium"), mark("fibre"), mark("ala")]).toEqual([90, 2600, 25, 1.1]);
  });

  it("never below the EAR", () => {
    expect(markFromValues("RDA", { rda: 8, ear: 6.8 })).toBe(6.8);
    expect(markFromValues("RDA", { rda: 18, ear: 8.1 })).toBe(14.4);
  });
});

describe("life-stage bands and modifiers", () => {
  const p31 = (o = {}) => profile({ birthYear: 1986, ...o });
  const p55 = (o = {}) => profile({ birthYear: 1970, menstruating: false, ...o });

  it("31–50 magnesium", () => expect(mark("magnesium", p31())).toBe(265));

  it("not menstruating changes iron only, not the age band (v1 bug)", () => {
    const p = p31({ menstruating: false });
    expect(bandFor(p, ON)).toBe("f31_50");
    expect(mark("iron", p)).toBe(6.4);
    expect(mark("calcium", p)).toBe(800);
    expect(mark("fibre", p)).toBe(25);
    expect(markFor("iron", p, ON).modifiers).toEqual(["iron_not_menstruating"]);
  });

  it("51–70", () => {
    expect(mark("iron", p55())).toBe(6.4);
    expect(mark("iron", p55({ menstruating: true }))).toBe(14.4);
    expect(mark("calcium", p55())).toBe(1000);
    expect(mark("fibre", p55())).toBe(21);
  });

  it("71+ calcium", () => expect(mark("calcium", profile({ birthYear: 1950, menstruating: false }))).toBe(1000));

  it("lactating is reachable and correct (v1 could never assign it)", () => {
    const p = profile({ status: "lactating", menstruating: false });
    expect(bandFor(p, ON)).toBe("lact19_30");
    expect(mark("vit_a_rae", p)).toBe(1040);
    expect(mark("iron", p)).toBe(7.2);
    expect(mark("iron", { ...p, menstruating: true })).toBe(14.4);
    expect(mark("epa_dha", p)).toBe(350);
    expect(mark("choline", p)).toBe(550);
    expect(mark("iodine", p)).toBe(232);
    expect(mark("zinc", p)).toBe(10.4);
    expect([mark("potassium", p), mark("fibre", p)]).toEqual([2800, 29]);
  });

  it("pregnant 31–50", () => {
    const p = p31({ status: "pregnant", menstruating: false });
    expect(bandFor(p, ON)).toBe("preg31_50");
    expect(mark("iron", p)).toBe(22);
    expect(mark("folate_dfe", p)).toBe(520);
    expect(mark("magnesium", p)).toBe(300);
    expect(mark("vit_a_rae", p)).toBe(616);
    expect(mark("epa_dha", p)).toBe(350);
    expect([mark("potassium", p), mark("fibre", p)]).toEqual([2900, 28]);
  });

  it("pregnancy ignores the menstruating flag", () => {
    const p = p31({ status: "pregnant", menstruating: true });
    expect(mark("iron", p)).toBe(22);
  });

  it("an 18-year-old uses 19–30", () => {
    const p = profile({ birthYear: 2007, birthMonth: 6 });
    expect(bandFor(p, ON)).toBe("f19_30");
    expect(mark("iron", p)).toBe(14.4);
  });

  it("under 18 is not eligible", () => {
    expect(() => bandFor(profile({ birthYear: 2008, birthMonth: 6 }), ON)).toThrow(IneligibleProfileError);
  });
});

describe("protein baseline", () => {
  it("flat 75 g without a weight", () => expect(proteinBaselineG(profile())).toBe(75));
  it("1.2 g/kg by default", () => expect(proteinBaselineG(profile({ weightKg: 60 }))).toBeCloseTo(72));
  it("clamped to 0.8–2.2", () => {
    expect(proteinBaselineG(profile({ weightKg: 60, proteinGPerKg: 3 }))).toBeCloseTo(132);
    expect(proteinBaselineG(profile({ weightKg: 60, proteinGPerKg: 0.5 }))).toBeCloseTo(48);
  });
});
