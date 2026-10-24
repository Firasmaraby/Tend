import { useMemo } from "react";
import { amountIn, eligibleFoods, isPeriodDay, NUTRIENT_CODES, periodDay, rankable, scoreFood, type NutrientCode, type Weights } from "@tend/core";
import { FOODS, lookup, marksFor, type ProtoFood } from "../engine";
import { useStore } from "./store";

const ALL_WEIGHTS: Weights = Object.fromEntries(NUTRIENT_CODES.map((n) => [n, 1])) as Weights;

export type ShareTable = Partial<Record<NutrientCode, number>>;

/** Share of her mark in one serving, per nutrient, straight from core's scoring. Unknown values are absent. */
export function sharesOf(food: ProtoFood, marks: ReturnType<typeof marksFor>): ShareTable | null {
  const r = scoreFood(food, { marks, weights: ALL_WEIGHTS, today: [], lookup });
  if (!r) return null;
  const t: ShareTable = {};
  for (const c of r.contributions) if (c.share !== undefined) t[c.nutrient] = c.share;
  return t;
}

/**
 * The shares a view may rank or advertise: spinach and chard calcium is
 * present (and still counts when she logs it) but is left out here.
 */
export function rankedShares(food: ProtoFood, t: ShareTable | null | undefined): ShareTable {
  const out: ShareTable = {};
  if (!t) return out;
  for (const n of NUTRIENT_CODES) if (t[n] !== undefined && rankable(food, n)) out[n] = t[n]!;
  return out;
}

/** Share of her mark in 100 g, for library foods that have no serving. Unknown values are absent. */
export function sharesPer100(food: ProtoFood, marks: ReturnType<typeof marksFor>): ShareTable {
  const t: ShareTable = {};
  for (const n of NUTRIENT_CODES) {
    const v = amountIn(food, n, 100);
    if (v !== undefined) t[n] = v / marks[n].value;
  }
  return t;
}

/** Everything a screen usually needs about her profile and round. */
export function useCtx() {
  const { state, dispatch } = useStore();
  const { profile, today, round } = state;
  const marks = useMemo(() => {
    try {
      return marksFor(profile, today);
    } catch {
      // Under 18 or not yet answered: core refuses to build marks, so use a neutral adult until she continues.
      return marksFor({ ...profile, birthYear: 1990, birthMonth: 1 }, today);
    }
  }, [profile, today]);
  const pool = useMemo(() => eligibleFoods(FOODS, profile) as unknown as ProtoFood[], [profile]);
  const order = useMemo(() => (round ? round.nutrients.map((n) => n.nutrient) : []), [round]);
  const active = useMemo(() => (round ? round.nutrients.filter((n) => n.role !== "locked").map((n) => n.nutrient) : []), [round]);
  // Period timing: on only if she opted in, menstruates, isn't pregnant, and today falls inside her period.
  const { periodEnabled, period } = state;
  const periodEligible = profile.menstruating && profile.status !== "pregnant";
  const periodActive = periodEnabled && isPeriodDay(profile, period, today);
  const periodDayNo = periodActive && period ? periodDay(period, today) : null;
  return { state, dispatch, profile, today, round, marks, pool, order, active, periodEligible, periodActive, periodDayNo };
}

/** Eligible foods with a known share of one nutrient, biggest first. */
export function topFoods(pool: ProtoFood[], marks: ReturnType<typeof marksFor>, n: NutrientCode, limit: number): { food: ProtoFood; share: number }[] {
  const rows: { food: ProtoFood; share: number }[] = [];
  const seenGroups = new Set<string>();
  const all = pool
    .map((food) => ({ food, t: sharesOf(food, marks) }))
    .map((x) => ({ food: x.food, t: x.t && rankedShares(x.food, x.t) }))
    .filter((x): x is { food: ProtoFood; t: ShareTable } => x.t !== null && x.t[n] !== undefined && (x.t[n] ?? 0) > 0)
    .sort((a, b) => (b.t[n] ?? 0) - (a.t[n] ?? 0));
  for (const x of all) {
    const g = x.food.dupGroupId;
    if (g && seenGroups.has(g)) continue;
    if (g) seenGroups.add(g);
    rows.push({ food: x.food, share: x.t[n] ?? 0 });
    if (rows.length >= limit) break;
  }
  return rows;
}
