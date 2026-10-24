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
  withPeriodWeights,
  adviceNutrients,
  type Meal,
  PROTEIN_WEIGHT,
  pairingsToday,
  pairingFor,
  helperFoods,
  type PairingMoment,
  type PairingRuleId,
  NUTRIENT_CODES,
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

export type ProtoFood = Food & {
  source: { id: string; name: string; citation: string; licence: string };
  missing: string[];
  /** true for foods from the full library: findable and loggable, never suggested. */
  library?: boolean;
};
/** The curated set: vetted servings and tags. Only these are ever suggested. */
export const FOODS = rawFoods as unknown as ProtoFood[];
const byId = new Map<string, ProtoFood>(FOODS.map((f) => [f.id, f]));
export const lookup = (id: string) => byId.get(id);

let library: ProtoFood[] | null = null;
/**
 * The full searchable library (every Canadian Nutrient File food in the
 * founder's database that isn't curated yet). Loaded on first search. These
 * foods have no vetted serving and no diet or allergen tags, so eligibleFoods
 * rejects them: searchable is not suggestable.
 */
export async function loadLibrary(): Promise<ProtoFood[]> {
  if (library) return library;
  const res = await fetch("library.json");
  const rows = (await res.json()) as { id: string; n: string; c: Food["category"]; v: Food["per100g"] }[];
  library = rows.map((r) => ({
    id: r.id,
    name: r.n,
    category: r.c,
    form: "prepared",
    per100g: r.v,
    suggestable: false,
    diet: null,
    allergens: null,
    pregnancyFlags: null,
    source: { id: "cnf", name: r.n, citation: "Canadian Nutrient File (Health Canada)", licence: "Open Government Licence - Canada" },
    missing: [],
    library: true,
  }));
  for (const f of library) byId.set(f.id, f);
  return library;
}
export const libraryLoaded = () => library !== null;

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

/** periodActive: on period days iron gets extra weight (the mark itself never changes). */
export function bestRightNow(p: Profile, round: RoundState, logs: readonly LogEntry[], today: LocalDate, mode: "serving" | "density", limit = 12, periodActive = false): Ranked[] {
  const marks = marksFor(p, today);
  const js = jars(p, round, logs, today);
  const roundMeanToDate: Partial<Record<NutrientCode, number>> = {};
  for (const j of js) if (j.roundMean !== undefined) roundMeanToDate[j.nutrient] = j.roundMean;
  return rank({
    pool: eligibleFoods(FOODS, p),
    marks,
    weights: withPeriodWeights({ ...weightsFromRoles(round.nutrients), protein: PROTEIN_WEIGHT }, periodActive),
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
    // The current day stops after breakfast, so the demo opens mid-day with meals still to come.
    const n = d === days - 1 ? 1 : 3 + Math.floor(rnd() * 3);
    for (let i = 0; i < n; i++) {
      const fromFav = rnd() < 0.65;
      const f = fromFav ? favourites[Math.floor(rnd() * favourites.length)]! : pool[Math.floor(rnd() * pool.length)]!;
      const mult = rnd() < 0.08 ? 2 : 1;
      const meal = (["breakfast", "lunch", "dinner", "snack", "snack"] as const)[i]!;
      logs.push({ id: `seed${++id}`, foodId: f.id, grams: f.serving!.grams * mult, logDate: date, meal });
    }
  }
  return logs;
}

export const nutrientName = (n: NutrientCode) => NUTRIENTS[n].name;
export const nutrientUnit = (n: NutrientCode) => NUTRIENTS[n].unit;

// ---- Foundation, full nutrient list, energy, absorption ----

export interface NutrientRow {
  nutrient: NutrientCode;
  /** Her three, protein, locked-in, then everything else. */
  group: "hers" | "foundation" | "locked" | "other";
  today: number;
  todayAmount: number;
  todayHasUnknown: boolean;
  /** Mean over logged days this round, unclamped; undefined before any logged day. */
  roundMean: number | undefined;
  mark: number;
}

/** Every tracked nutrient, for the "All nutrients" view. Coverage relative to her mark. */
export function allNutrients(p: Profile, round: RoundState, logs: readonly LogEntry[], today: LocalDate): NutrientRow[] {
  const marks = marksFor(p, today);
  const todays = entriesOn(logs, today);
  const inRound = groupByDate(logs.filter((e) => isInRound(e.logDate, round) && e.logDate <= today));
  const role = new Map(round.nutrients.map((n) => [n.nutrient, n.role]));
  const rows = NUTRIENT_CODES.map((n): NutrientRow => {
    const t = totalFor(todays, n, lookup);
    let sum = 0;
    for (const [, es] of inRound) sum += coverage(totalFor(es, n, lookup), marks[n].value);
    const r = role.get(n);
    const group = n === "protein" ? "foundation" : r === "locked" ? "locked" : r ? "hers" : "other";
    return {
      nutrient: n,
      group,
      today: coverage(t, marks[n].value),
      todayAmount: t.known,
      todayHasUnknown: t.hasUnknown,
      roundMean: inRound.size ? sum / inRound.size : undefined,
      mark: marks[n].value,
    };
  });
  const order = { hers: 0, foundation: 1, locked: 2, other: 3 } as const;
  return rows.sort((a, b) => order[a.group] - order[b.group]);
}

export function proteinToday(p: Profile, logs: readonly LogEntry[], today: LocalDate) {
  const t = totalFor(entriesOn(logs, today), "protein", lookup);
  return { grams: t.known, mark: marksFor(p, today).protein.value, hasUnknown: t.hasUnknown };
}

/** Opt-in energy. Counts up; there is no energy target in Tend. */
export function energyToday(logs: readonly LogEntry[], today: LocalDate) {
  let kcal = 0;
  let unknown = false;
  for (const e of entriesOn(logs, today)) {
    const v = lookup(e.foodId)?.per100g.energy_kcal;
    if (v === undefined) unknown = true;
    else kcal += (v * e.grams) / 100;
  }
  return { kcal, hasUnknown: unknown };
}

const hersOf = (round: RoundState) => round.nutrients.map((n) => n.nutrient);

export function pairingMoments(p: Profile, round: RoundState, logs: readonly LogEntry[], today: LocalDate, periodActive = false): PairingMoment[] {
  return pairingsToday(entriesOn(logs, today), lookup, marksFor(p, today), adviceNutrients(hersOf(round), periodActive));
}

export function pairingForFood(p: Profile, round: RoundState, food: Food, today: LocalDate, periodActive = false): PairingRuleId | null {
  return pairingFor(food, marksFor(p, today), adviceNutrients(hersOf(round), periodActive));
}

export function helpersFor(p: Profile, rule: PairingRuleId, limit = 3): ProtoFood[] {
  return helperFoods(rule, eligibleFoods(FOODS, p), limit) as ProtoFood[];
}

// ---- Meals: repeat a meal ----

export function mealEntries(logs: readonly LogEntry[], date: LocalDate, meal: Meal): LogEntry[] {
  return logs.filter((e) => e.logDate === date && e.meal === meal);
}

/** Yesterday's meal she could repeat now: only if it had food and today's same meal is still empty. */
export function repeatableMeal(logs: readonly LogEntry[], today: LocalDate, meal: Meal): LogEntry[] {
  if (mealEntries(logs, today, meal).length > 0) return [];
  return mealEntries(logs, addDays(today, -1), meal);
}

// ---- Shopping list ----

export type Aisle = "Produce" | "Beans, grains and seeds" | "Fish and meat" | "Dairy and eggs" | "Pantry";
const AISLE: Partial<Record<Food["category"], Aisle>> = {
  leafy_greens: "Produce", vegetables: "Produce", fruit: "Produce",
  legumes: "Beans, grains and seeds", grains: "Beans, grains and seeds", nuts_seeds: "Beans, grains and seeds", small_seeds: "Beans, grains and seeds",
  fish: "Fish and meat", shellfish: "Fish and meat", meat: "Fish and meat", poultry: "Fish and meat", organ_meat: "Fish and meat",
  milk: "Dairy and eggs", yogurt: "Dairy and eggs", cheese: "Dairy and eggs", eggs: "Dairy and eggs",
};
export const AISLE_ORDER: Aisle[] = ["Produce", "Beans, grains and seeds", "Fish and meat", "Dairy and eggs", "Pantry"];

export interface ShoppingItem {
  food: ProtoFood;
  /** Why it's on the list, in her terms. */
  reason: string;
  kind: "rotation" | "try" | "pairing";
}

/**
 * Built from what she already eats (rotation), the strongest foods for her
 * three that she hasn't made hers yet, and helpers for the pairings that
 * apply to her foods. Only eligible foods: allergens and diet already applied.
 */
export function shoppingList(p: Profile, round: RoundState, logs: readonly LogEntry[], today: LocalDate): { aisle: Aisle; items: ShoppingItem[] }[] {
  const items = new Map<string, ShoppingItem>();
  const eligibleIds = new Set(eligibleFoods(FOODS, p).map((f) => f.id));
  const rot = rotation(round, logs).filter((r) => eligibleIds.has(r.food.id));
  for (const r of rot.slice(0, 8)) items.set(r.food.id, { food: r.food, reason: `In your rotation (${r.days} days)`, kind: "rotation" });

  const marks = marksFor(p, today);
  const fresh = rank({
    pool: eligibleFoods(FOODS, p),
    marks,
    weights: { ...weightsFromRoles(round.nutrients), protein: PROTEIN_WEIGHT },
    today: [],
    lookup,
    mode: "serving",
    limit: 12,
  });
  let tries = 0;
  for (const r of fresh) {
    if (tries >= 5 || items.has(r.food.id)) continue;
    const best = [...r.contributions].sort((a, b) => b.gain - a.gain)[0];
    if (!best || best.gain <= 0) continue;
    items.set(r.food.id, { food: r.food as ProtoFood, reason: `Good for your ${nutrientName(best.nutrient).toLowerCase()}`, kind: "try" });
    tries++;
  }

  const hers = round.nutrients.map((n) => n.nutrient);
  const listed = [...items.values()].map((i) => i.food);
  for (const rule of ["iron_vitamin_c", "fat_soluble"] as const) {
    const target = listed.find((f) => pairingFor(f, marks, hers) === rule);
    if (!target) continue;
    for (const h of helpersFor(p, rule, 2)) {
      if (!items.has(h.id)) items.set(h.id, { food: h, reason: `Pairs with your ${target.name.split(",")[0]!.toLowerCase()}`, kind: "pairing" });
    }
  }

  const byAisle = new Map<Aisle, ShoppingItem[]>();
  for (const it of items.values()) {
    const a = AISLE[it.food.category] ?? "Pantry";
    byAisle.set(a, [...(byAisle.get(a) ?? []), it]);
  }
  return AISLE_ORDER.filter((a) => byAisle.has(a)).map((aisle) => ({ aisle, items: byAisle.get(aisle)! }));
}
