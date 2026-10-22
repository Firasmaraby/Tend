// "Best right now": foods ranked by how far one serving moves her toward her
// marks. Gain stops at the mark (going over is fine, it just isn't what we
// rank for), and progress blends today with the round so far, because the
// round is judged on a mean: yesterday's salmon really does carry today.

import { coverage, totalFor, type FoodLookup, type LogEntry } from "./coverage";
import type { EligiblePool } from "./eligibility";
import { amountIn, type Food } from "./foods";
import { NUTRIENT_CODES, type NutrientCode } from "./nutrients";
import type { Role } from "./rounds";
import type { Marks } from "./targets";
import { servingGuard } from "./upperLimits";

export const ROLE_WEIGHT: Record<Role, number> = { focus: 1, carried: 1, project: 0.6, locked: 0.3 };
export const DENSITY_KCAL_FLOOR = 25;
/** Density mode only lists foods giving at least this share of some weighted mark. */
export const DENSITY_MIN_CONTRIBUTION = 0.1;
export const DIVERSITY_DECAY = 0.85;

export type Weights = Partial<Record<NutrientCode, number>>;

export function weightsFromRoles(roles: readonly { nutrient: NutrientCode; role: Role }[]): Weights {
  const w: Weights = {};
  for (const { nutrient, role } of roles) w[nutrient] = Math.max(w[nutrient] ?? 0, ROLE_WEIGHT[role]);
  return w;
}

/** Room left toward the mark, 0 to 1. */
export function roomLeft(todayCoverage: number, roundMeanToDate: number | undefined): number {
  const progress = roundMeanToDate === undefined ? todayCoverage : 0.5 * todayCoverage + 0.5 * roundMeanToDate;
  return Math.max(0, 1 - progress);
}

export interface Contribution {
  nutrient: NutrientCode;
  /** Share of the mark in one serving (unclamped). undefined = unknown in the data. */
  share: number | undefined;
  gain: number;
}

export interface Ranked {
  food: Food;
  score: number;
  /** score ÷ max(kcal, floor); undefined when energy is unknown. */
  density: number | undefined;
  servingKcal: number | undefined;
  contributions: Contribution[];
  maxServingsPerDay?: 1;
}

export interface RankInput {
  pool: EligiblePool;
  marks: Marks;
  weights: Weights;
  today: readonly LogEntry[];
  /** Logged-day mean coverage for the round so far, excluding today. */
  roundMeanToDate?: Partial<Record<NutrientCode, number>>;
  lookup: FoodLookup;
  mode: "serving" | "density";
  limit?: number;
}

export function scoreFood(food: Food, input: Omit<RankInput, "pool" | "mode" | "limit">): Ranked | null {
  const serving = food.serving;
  if (!serving) return null;
  const guard = servingGuard(food, serving.grams, input.marks, input.today, input.lookup);
  if (guard.kind === "excluded") return null;

  let score = 0;
  const contributions: Contribution[] = [];
  for (const n of NUTRIENT_CODES) {
    const w = input.weights[n];
    if (!w) continue;
    const mark = input.marks[n].value;
    const amt = amountIn(food, n, serving.grams);
    const share = amt === undefined ? undefined : amt / mark;
    const todayCov = coverage(totalFor(input.today, n, input.lookup), mark);
    const gain = share === undefined ? 0 : Math.min(share, roomLeft(todayCov, input.roundMeanToDate?.[n]));
    score += w * gain;
    contributions.push({ nutrient: n, share, gain });
  }
  const servingKcal = amountIn(food, "energy_kcal", serving.grams);
  const ranked: Ranked = {
    food,
    score,
    density: servingKcal === undefined ? undefined : score / Math.max(servingKcal, DENSITY_KCAL_FLOOR),
    servingKcal,
    contributions,
  };
  if (guard.kind === "capped") ranked.maxServingsPerDay = 1;
  return ranked;
}

export function rank(input: RankInput): Ranked[] {
  const scored: Ranked[] = [];
  for (const food of input.pool) {
    const r = scoreFood(food, input);
    if (!r || r.score <= 0) continue;
    if (input.mode === "density") {
      if (r.density === undefined) continue;
      const best = Math.max(0, ...r.contributions.map((c) => c.share ?? 0));
      if (best < DENSITY_MIN_CONTRIBUTION) continue;
    }
    scored.push(r);
  }
  const key = (r: Ranked) => (input.mode === "density" ? (r.density ?? 0) : r.score);
  return diversify(scored, key, input.limit ?? 20);
}

/**
 * Greedy pick: each food already chosen from a category discounts the rest of
 * that category, so the list isn't ten leafy greens. Duplicate groups appear once.
 */
export function diversify(items: Ranked[], key: (r: Ranked) => number, limit: number): Ranked[] {
  const remaining = [...items];
  const picked: Ranked[] = [];
  const perCategory = new Map<string, number>();
  const groups = new Set<string>();
  while (picked.length < limit && remaining.length > 0) {
    let bestIdx = -1;
    let bestVal = -Infinity;
    remaining.forEach((r, i) => {
      const v = key(r) * DIVERSITY_DECAY ** (perCategory.get(r.food.category) ?? 0);
      if (v > bestVal || (v === bestVal && bestIdx >= 0 && r.food.id < remaining[bestIdx]!.food.id)) {
        bestVal = v;
        bestIdx = i;
      }
    });
    const [chosen] = remaining.splice(bestIdx, 1);
    if (!chosen) break;
    const g = chosen.food.dupGroupId;
    if (g && groups.has(g)) continue;
    if (g) groups.add(g);
    picked.push(chosen);
    perCategory.set(chosen.food.category, (perCategory.get(chosen.food.category) ?? 0) + 1);
  }
  return picked;
}
