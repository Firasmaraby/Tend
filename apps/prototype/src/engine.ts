// Glue between the UI and @tend/core. All nutrition maths lives in core; this
// file only assembles state for screens and seeds demo histories.

import {
  addDays,
  ageOn,
  allMarks,
  closeRound,
  coverage,
  dayOfRound,
  eligibleFoods,
  groupByDate,
  isInRound,
  NUTRIENTS,
  nutrientResult,
  narrowPool,
  rank,
  servingGuard,
  roundEndsOn,
  selectabilityReport,
  totalFor,
  weightsFromRoles,
  type Food,
  type LocalDate,
  type LogEntry,
  type Marks,
  type NutrientCode,
  type Profile,
  type Ranked,
  type Role,
  type RoundNutrient,
} from "@tend/core";
import rawFoods from "./foods.json";
import { FREQUENCIES, SCREENER } from "./content";

export type ProtoFood = Food & { source: { id: string; name: string; citation: string; licence: string }; missing: string[] };
export const FOODS = rawFoods as unknown as ProtoFood[];
const byId = new Map(FOODS.map((f) => [f.id, f]));
export const lookup = (id: string) => byId.get(id);

export interface RoundState {
  number: number;
  startedOn: LocalDate;
  endsOn: LocalDate;
  nutrients: RoundNutrient[];
}

export function newRound(number: number, startedOn: LocalDate, nutrients: RoundNutrient[]): RoundState {
  return { number, startedOn, endsOn: roundEndsOn(startedOn), nutrients };
}

export const marksFor = (p: Profile, on: LocalDate): Marks => allMarks(p, on);

export type PickStatus = "ok" | "floor" | "policy";
export interface Pickable {
  nutrient: NutrientCode;
  status: PickStatus;
  qualifying: number;
}

/** Which nutrients she can choose, honestly: the selectability floor and vitamin D policy apply. */
export function pickable(p: Profile, on: LocalDate): Pickable[] {
  const rows = selectabilityReport(FOODS, marksFor(p, on), p);
  return [
    ...rows.map((r) => ({ nutrient: r.nutrient, status: (r.selectable ? "ok" : "floor") as PickStatus, qualifying: r.qualifying })),
    { nutrient: "vit_d" as NutrientCode, status: "policy" as PickStatus, qualifying: 0 },
  ];
}

export interface Suggestion {
  nutrient: NutrientCode;
  score: number;
  reason: string;
}

/** Starter questions plus life stage → three suggested nutrients, each with a reason. */
export function suggestThree(p: Profile, answers: Record<string, string>, on: LocalDate): Suggestion[] {
  const ok = new Set(pickable(p, on).filter((x) => x.status === "ok").map((x) => x.nutrient));
  const score = new Map<NutrientCode, number>();
  const why = new Map<NutrientCode, { w: number; text: string }>();
  const add = (n: NutrientCode, w: number, text: string) => {
    if (!ok.has(n) || w <= 0) return;
    score.set(n, (score.get(n) ?? 0) + w);
    const cur = why.get(n);
    if (!cur || w > cur.w) why.set(n, { w, text });
  };
  for (const q of SCREENER) {
    const need = FREQUENCIES.find((f) => f.id === answers[q.id])?.need ?? 0;
    const text = answers[q.id] === "rarely" ? `You rarely have ${q.noun}.` : `You have ${q.noun} only some weeks.`;
    for (const [n, w] of Object.entries(q.weights)) add(n as NutrientCode, need * (w ?? 0), text);
  }
  const age = ageOn(p, on);
  if (p.menstruating && p.status === "none") add("iron", 2, "Menstruating raises your iron needs.");
  if (age >= 50) {
    add("calcium", 2, "Calcium needs rise after 50.");
    add("magnesium", 1, "Magnesium supports bones as needs change after 50.");
  }
  if (p.status === "pregnant") {
    add("folate_dfe", 3, "Folate matters most during pregnancy.");
    add("iron", 2, "Iron needs rise a lot during pregnancy.");
    add("choline", 2, "Choline needs rise during pregnancy.");
  }
  if (p.status === "lactating") {
    add("choline", 2, "Choline needs rise while breastfeeding.");
    add("vit_a_rae", 2, "Vitamin A needs nearly double while breastfeeding.");
  }
  if (p.diet === "vegan") {
    add("vit_b12", 3, "Plant-based eating makes B12 hard to get from food.");
    add("calcium", 1, "Without dairy, calcium takes a little planning.");
    add("zinc", 1, "Zinc from plants is absorbed less well.");
  }
  if (p.diet === "vegetarian") add("iron", 1, "Iron from plants is absorbed less well.");
  return [...score.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([nutrient, s]) => ({ nutrient, score: s, reason: why.get(nutrient)?.text ?? "" }));
}

export const entriesOn = (logs: readonly LogEntry[], d: LocalDate) => logs.filter((e) => e.logDate === d);

export interface JarState {
  nutrient: NutrientCode;
  role: Role;
  today: number;
  todayHasUnknown: boolean;
  roundMean: number | undefined;
  loggedDays: number;
}

export function jars(p: Profile, round: RoundState, logs: readonly LogEntry[], today: LocalDate): JarState[] {
  const marks = marksFor(p, today);
  const todays = entriesOn(logs, today);
  const before = logs.filter((e) => isInRound(e.logDate, round) && e.logDate < today);
  const byDate = groupByDate(before);
  return round.nutrients.map(({ nutrient, role }) => {
    const t = totalFor(todays, nutrient, lookup);
    let sum = 0;
    for (const [, es] of byDate) sum += coverage(totalFor(es, nutrient, lookup), marks[nutrient].value);
    return {
      nutrient,
      role,
      today: coverage(t, marks[nutrient].value),
      todayHasUnknown: t.hasUnknown,
      roundMean: byDate.size ? sum / byDate.size : undefined,
      loggedDays: byDate.size + (todays.length ? 1 : 0),
    };
  });
}

export function bestRightNow(p: Profile, round: RoundState, logs: readonly LogEntry[], today: LocalDate, mode: "serving" | "density", limit = 12): Ranked[] {
  const marks = marksFor(p, today);
  const js = jars(p, round, logs, today);
  const roundMeanToDate: Partial<Record<NutrientCode, number>> = {};
  for (const j of js) if (j.roundMean !== undefined) roundMeanToDate[j.nutrient] = j.roundMean;
  return rank({
    pool: eligibleFoods(FOODS, p),
    marks,
    weights: weightsFromRoles(round.nutrients),
    today: entriesOn(logs, today),
    roundMeanToDate,
    lookup,
    mode,
    limit,
  });
}

/** Foods she has logged on at least four distinct days this round: "becoming yours". */
export function rotation(round: RoundState, logs: readonly LogEntry[]): { food: ProtoFood; days: number }[] {
  const days = new Map<string, Set<string>>();
  for (const e of logs) {
    if (!isInRound(e.logDate, round)) continue;
    const s = days.get(e.foodId) ?? new Set<string>();
    s.add(e.logDate);
    days.set(e.foodId, s);
  }
  return [...days.entries()]
    .filter(([, s]) => s.size >= 4)
    .map(([id, s]) => ({ food: lookup(id)!, days: s.size }))
    .filter((r) => r.food)
    .sort((a, b) => b.days - a.days);
}

export function loggedDayCount(round: RoundState, logs: readonly LogEntry[]): number {
  return new Set(logs.filter((e) => isInRound(e.logDate, round)).map((e) => e.logDate)).size;
}

export const roundDay = (round: RoundState, today: LocalDate) => dayOfRound(today, round) ?? 42;

export function endOfRound(p: Profile, round: RoundState, logs: readonly LogEntry[]) {
  const marks = marksFor(p, round.endsOn);
  const results = round.nutrients.map(({ nutrient, role }) => nutrientResult(nutrient, role, marks[nutrient].value, round, logs, lookup));
  return { results, close: closeRound(results), rotation: rotation(round, logs), loggedDays: loggedDayCount(round, logs) };
}

// ---- Demo histories (clearly sample data) ----

function mulberry32(seed: number) {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * A realistic sample history through `days` days of the round: about one day
 * in five unlogged, a rotation of favourite foods, the occasional big day.
 * The last focus nutrient gets less attention so the end of round shows an
 * honest carry-forward.
 */
export function seedHistory(p: Profile, round: RoundState, days: number, seed = 7): LogEntry[] {
  const rnd = mulberry32(seed);
  // Sample days only use foods Tend could suggest on an empty day.
  const marksAtStart = marksFor(p, round.startedOn);
  const pool = narrowPool(eligibleFoods(FOODS, p), (f) => servingGuard(f, f.serving!.grams, marksAtStart, [], lookup).kind !== "excluded");
  const focus = round.nutrients.filter((n) => n.role === "focus" || n.role === "carried");
  const weights = Object.fromEntries(focus.map((n, i) => [n.nutrient, i === focus.length - 1 ? 0.1 : 1]));
  const marks = marksFor(p, round.startedOn);
  const favourites = rank({ pool, marks, weights, today: [], lookup, mode: "serving", limit: 9 }).map((r) => r.food);
  const logs: LogEntry[] = [];
  let id = 0;
  for (let d = 0; d < days; d++) {
    if (rnd() < 0.2) continue;
    const date = addDays(round.startedOn, d);
    const n = 3 + Math.floor(rnd() * 3);
    for (let i = 0; i < n; i++) {
      const fromFav = rnd() < 0.65;
      const f = fromFav ? favourites[Math.floor(rnd() * favourites.length)]! : pool[Math.floor(rnd() * pool.length)]!;
      const mult = rnd() < 0.08 ? 2 : 1;
      logs.push({ id: `seed${++id}`, foodId: f.id, grams: f.serving!.grams * mult, logDate: date });
    }
  }
  return logs;
}

export const nutrientName = (n: NutrientCode) => NUTRIENTS[n].name;
export const nutrientUnit = (n: NutrientCode) => NUTRIENTS[n].unit;
