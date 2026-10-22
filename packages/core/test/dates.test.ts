import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { addDays, asLocalDate, canLogFor, daysBetween, dayOfRound, fromDayNumber, isInRound, localDateIn, nextRoundStart, roundEndsOn } from "../src";

const d = asLocalDate;

describe("round window: one convention, inclusive", () => {
  const start = d("2026-03-02");
  const round = { startedOn: start, endsOn: roundEndsOn(start) };

  it("ends_on is start + 41", () => expect(round.endsOn).toBe("2026-04-12"));
  it("the last day counts, the next day does not", () => {
    expect(isInRound(d("2026-04-12"), round)).toBe(true);
    expect(dayOfRound(d("2026-04-12"), round)).toBe(42);
    expect(isInRound(d("2026-04-13"), round)).toBe(false);
    expect(dayOfRound(d("2026-03-02"), round)).toBe(1);
  });

  it("every round has exactly 42 days, for any start", () => {
    fc.assert(
      fc.property(fc.integer({ min: 18000, max: 25000 }), (n) => {
        const s = fromDayNumber(n);
        return daysBetween(s, roundEndsOn(s)) + 1 === 42;
      }),
    );
  });

  it("rounds are contiguous when she picks within a week of the end", () => {
    expect(nextRoundStart(d("2026-04-12"), d("2026-04-10"))).toBe("2026-04-13");
    expect(nextRoundStart(d("2026-04-12"), d("2026-04-19"))).toBe("2026-04-13");
    expect(nextRoundStart(d("2026-04-12"), d("2026-04-20"))).toBe("2026-04-20");
  });
});

describe("calendar dates in her zone", () => {
  it("Toronto across the DST start", () => {
    expect(localDateIn(new Date("2026-03-08T04:30:00Z"), "America/Toronto")).toBe("2026-03-07");
    expect(localDateIn(new Date("2026-03-08T07:30:00Z"), "America/Toronto")).toBe("2026-03-08");
  });
  it("UTC+14", () => expect(localDateIn(new Date("2026-03-07T10:30:00Z"), "Pacific/Kiritimati")).toBe("2026-03-08"));
  it("Lord Howe half-hour DST end", () => {
    expect(localDateIn(new Date("2026-04-04T12:45:00Z"), "Australia/Lord_Howe")).toBe("2026-04-04");
    expect(localDateIn(new Date("2026-04-04T13:15:00Z"), "Australia/Lord_Howe")).toBe("2026-04-05");
  });
  it("rejects impossible dates", () => expect(() => asLocalDate("2026-02-30")).toThrow());
  it("addDays crosses DST without drift", () => expect(addDays(d("2026-03-07"), 2)).toBe("2026-03-09"));
});

describe("backdating is yesterday only", () => {
  const now = new Date("2026-03-08T16:00:00Z"); // 12:00 EDT
  const tz = "America/Toronto";
  it.each([
    ["2026-03-08", true],
    ["2026-03-07", true],
    ["2026-03-06", false],
    ["2026-03-09", false],
  ])("%s → %s", (date, ok) => expect(canLogFor(d(date), now, tz)).toBe(ok));
});
