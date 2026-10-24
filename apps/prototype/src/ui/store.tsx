// App state. One reducer, one context. Nothing here does nutrition maths:
// that all comes from @tend/core via ../engine.
import { createContext, useContext, useEffect, useMemo, useReducer, type ReactNode, type Dispatch } from "react";
import { addDays, asLocalDate, nextRoundStart, PERIOD_DEFAULT_DAYS, type FoodCategory, type LocalDate, type LogEntry, type Meal, type NutrientCode, type PeriodState, type Profile, type RoundNutrient } from "@tend/core";
import { lookup, newRound, seedHistory, type RoundState } from "../engine";
import type { HintId } from "../content";

export type Phase = "guide" | "about" | "screener" | "choose" | "app" | "end";
export type Tab = "today" | "browse" | "learn" | "round";
export type Theme = "auto" | "light" | "dark";
/** A full screen that sits over the current tab (with its own back link). */
export type Page = "shopping" | "week";
export type DemoKind = "day9" | "day14" | "day36" | "end" | "period";

export type SheetSpec =
  | { kind: "explainer"; nutrient: NutrientCode }
  | { kind: "add"; date?: LocalDate; mode?: "shopping" }
  | { kind: "food"; foodId: string }
  | { kind: "entry"; id: string }
  | { kind: "glossary"; term: string }
  | { kind: "all" }
  | { kind: "settings" }
  | { kind: "period" };

export interface NextRoundContext {
  carried: NutrientCode | null;
  locked: NutrientCode[];
  projects: NutrientCode[];
}

/** A line she typed onto the shopping list. */
export interface CustomItem {
  id: string;
  name: string;
}
/** A food she picked for the shopping list. Kept with its name so it shows even before the full library loads. */
export interface AddedFood {
  id: string;
  name: string;
  category: FoodCategory;
  serving?: string;
}
/** What the toast's Undo button puts back. */
export type ShopUndo = { kind: "restore"; foodId: string } | { kind: "custom"; item: CustomItem; at: number } | { kind: "food"; item: AddedFood; at: number };

export interface AppState {
  phase: Phase;
  /** Where the guide goes when it finishes. */
  guideReturn: "about" | "app";
  profile: Profile;
  profileSet: boolean;
  answers: Record<string, string>;
  today: LocalDate;
  round: RoundState | null;
  logs: LogEntry[];
  addedAt: Record<string, number>;
  tab: Tab;
  page: Page | null;
  /** The day Today is showing: null means today. Never kept between tabs. */
  viewDate: LocalDate | null;
  /** Shopping list ticks, by item key. Kept in localStorage when it is available. */
  shopChecked: string[];
  /** Generated items she took off the list, by food id. Kept in localStorage too. */
  shopRemoved: string[];
  /** Her own typed items, newest first. Kept in localStorage too. */
  shopCustom: CustomItem[];
  /** Foods she picked for the list, newest first. Kept in localStorage too. */
  shopAdded: AddedFood[];
  learnNutrient: NutrientCode | null;
  /** A Learn page that isn't a nutrient. */
  learnTopic: "pairing" | null;
  /** Opt-in energy (DECISIONS.md 17): off by default. */
  showEnergy: boolean;
  /** Once-only tips: on by default. */
  showTips: boolean;
  /** Period timing (opt-in, off by default). Only the current period's start and her usual length are kept. */
  periodEnabled: boolean;
  period: PeriodState | null;
  /** How many days hers usually lasts, 2 to 10: used when she says it started. */
  periodLength: number;
  /** Asked once, can be skipped: null means not answered. Never used for anything but a care line. */
  heavyPeriods: boolean | null;
  sheets: SheetSpec[];
  seen: HintId[];
  mode: "serving" | "density";
  sample: boolean;
  choosing: NextRoundContext | null;
  theme: Theme;
  toast: string | null;
  /** When set, the toast shows an Undo button that dispatches this. */
  toastUndo: ShopUndo | null;
  seq: number;
}

export const NEW_USER_TODAY = asLocalDate("2026-10-22");
export const DEMO_START = asLocalDate("2026-10-05");

export const DEMO_PROFILE: Profile = {
  birthYear: 1981,
  birthMonth: 4,
  status: "none",
  menstruating: true,
  diet: "omnivore",
  allergens: [],
  timeZone: "America/Toronto",
};

const BLANK_PROFILE: Profile = {
  birthYear: 0,
  birthMonth: 0,
  status: "none",
  menstruating: true,
  diet: "omnivore",
  allergens: [],
  timeZone: "America/Toronto",
};

export function initialState(theme: Theme = "auto"): AppState {
  return {
    phase: "guide",
    guideReturn: "about",
    profile: BLANK_PROFILE,
    profileSet: false,
    answers: {},
    today: NEW_USER_TODAY,
    round: null,
    logs: [],
    addedAt: {},
    tab: "today",
    page: null,
    viewDate: null,
    shopChecked: [],
    shopRemoved: [],
    shopCustom: [],
    shopAdded: [],
    learnNutrient: null,
    learnTopic: null,
    showEnergy: false,
    showTips: true,
    periodEnabled: false,
    period: null,
    periodLength: PERIOD_DEFAULT_DAYS,
    heavyPeriods: null,
    sheets: [],
    seen: [],
    mode: "serving",
    sample: false,
    choosing: null,
    theme,
    toast: null,
    toastUndo: null,
    seq: 0,
  };
}

type Action =
  | { t: "phase"; phase: Phase }
  | { t: "openGuide"; from: "about" | "app" }
  | { t: "profile"; patch: Partial<Profile> }
  | { t: "profileSet" }
  | { t: "answer"; id: string; value: string }
  | { t: "startRound"; nutrients: RoundNutrient[] }
  | { t: "log"; foodId: string; servings: number; date: LocalDate; at: number; grams?: number; meal?: Meal }
  | { t: "setMeal"; id: string; meal: Meal }
  | { t: "repeat"; from: LogEntry[]; date: LocalDate; meal?: Meal; at: number }
  | { t: "viewDay"; date: LocalDate | null }
  | { t: "shopRemove"; foodId: string }
  | { t: "shopRestore"; foodId: string }
  | { t: "shopRestoreAll" }
  | { t: "shopAddCustom"; item: CustomItem }
  | { t: "shopRemoveCustom"; id: string }
  | { t: "shopAddFood"; item: AddedFood }
  | { t: "shopRemoveFood"; id: string }
  | { t: "shopUndo"; undo: ShopUndo }
  | { t: "toastUndo"; text: string; undo: ShopUndo }
  | { t: "page"; page: Page | null }
  | { t: "shopToggle"; foodId: string }
  | { t: "shopClear" }
  | { t: "setting"; key: "showEnergy" | "showTips"; value: boolean }
  | { t: "periodEnabled"; value: boolean }
  | { t: "periodLength"; days: number }
  | { t: "periodStart"; daysAgo: 0 | 1 }
  | { t: "periodEnd" }
  | { t: "periodReopen" }
  | { t: "heavy"; value: boolean | null }
  | { t: "learnTopic"; topic: "pairing" | null }
  | { t: "unlog"; id: string }
  | { t: "tab"; tab: Tab }
  | { t: "learn"; nutrient: NutrientCode | null }
  | { t: "sheet"; sheet: SheetSpec }
  | { t: "closeSheet" }
  | { t: "closeAllSheets" }
  | { t: "seen"; id: HintId }
  | { t: "mode"; mode: "serving" | "density" }
  | { t: "demo"; kind: DemoKind }
  | { t: "reset" }
  | { t: "theme"; theme: Theme }
  | { t: "toast"; text: string | null }
  | { t: "choosing"; ctx: NextRoundContext | null };

function reducer(s: AppState, a: Action): AppState {
  switch (a.t) {
    case "phase":
      return { ...s, phase: a.phase, page: null, sheets: [] };
    case "openGuide":
      return { ...s, phase: "guide", guideReturn: a.from, sheets: [] };
    case "profile":
      return { ...s, profile: { ...s.profile, ...a.patch } };
    case "profileSet":
      return { ...s, profileSet: true };
    case "answer":
      return { ...s, answers: { ...s.answers, [a.id]: a.value } };
    case "startRound": {
      const number = s.round ? s.round.number + 1 : 1;
      const startedOn = s.round ? nextRoundStart(s.round.endsOn, s.today) : s.today;
      return {
        ...s,
        round: newRound(number, startedOn, a.nutrients),
        phase: "app",
        tab: "today",
        page: null,
        choosing: null,
        sheets: [],
        mode: "serving",
      };
    }
    case "log": {
      const f = lookup(a.foodId);
      // Curated foods log by servings; library foods have no serving, so they log by grams.
      const grams = a.grams ?? (f?.serving ? f.serving.grams * a.servings : undefined);
      if (!f || grams === undefined) return s;
      const id = `u${s.seq + 1}`;
      const entry: LogEntry = { id, foodId: a.foodId, grams: Math.round(grams * 100) / 100, logDate: a.date, ...(a.meal ? { meal: a.meal } : {}) };
      return { ...s, seq: s.seq + 1, logs: [...s.logs, entry], addedAt: { ...s.addedAt, [id]: a.at } };
    }
    case "setMeal":
      return { ...s, logs: s.logs.map((e) => (e.id === a.id ? { ...e, meal: a.meal } : e)) };
    case "repeat": {
      // Copies, not moves: new ids, today's date, the same grams.
      let seq = s.seq;
      const added = { ...s.addedAt };
      const copies = a.from.map((e): LogEntry => {
        const id = `u${++seq}`;
        added[id] = a.at;
        return { id, foodId: e.foodId, grams: e.grams, logDate: a.date, ...(a.meal ? { meal: a.meal } : {}) };
      });
      return { ...s, seq, logs: [...s.logs, ...copies], addedAt: added };
    }
    case "page":
      return { ...s, page: a.page, sheets: [] };
    case "shopToggle":
      return { ...s, shopChecked: s.shopChecked.includes(a.foodId) ? s.shopChecked.filter((x) => x !== a.foodId) : [...s.shopChecked, a.foodId] };
    case "shopClear":
      return { ...s, shopChecked: [] };
    case "viewDay":
      return { ...s, tab: "today", page: null, sheets: [], viewDate: a.date === s.today ? null : a.date };
    case "shopRemove":
      return s.shopRemoved.includes(a.foodId) ? s : { ...s, shopRemoved: [...s.shopRemoved, a.foodId] };
    case "shopRestore":
      return { ...s, shopRemoved: s.shopRemoved.filter((x) => x !== a.foodId) };
    case "shopRestoreAll":
      return { ...s, shopRemoved: [] };
    case "shopAddCustom":
      return { ...s, shopCustom: [a.item, ...s.shopCustom] };
    case "shopRemoveCustom":
      return { ...s, shopCustom: s.shopCustom.filter((c) => c.id !== a.id), shopChecked: s.shopChecked.filter((x) => x !== a.id) };
    case "shopAddFood":
      return s.shopAdded.some((f) => f.id === a.item.id) ? s : { ...s, shopAdded: [a.item, ...s.shopAdded] };
    case "shopRemoveFood":
      return { ...s, shopAdded: s.shopAdded.filter((f) => f.id !== a.id), shopChecked: s.shopChecked.filter((x) => x !== a.id) };
    case "shopUndo": {
      const u = a.undo;
      if (u.kind === "restore") return { ...s, shopRemoved: s.shopRemoved.filter((x) => x !== u.foodId), toast: null, toastUndo: null };
      if (u.kind === "custom") {
        const list = s.shopCustom.filter((c) => c.id !== u.item.id);
        list.splice(Math.min(u.at, list.length), 0, u.item);
        return { ...s, shopCustom: list, toast: null, toastUndo: null };
      }
      const list = s.shopAdded.filter((f) => f.id !== u.item.id);
      list.splice(Math.min(u.at, list.length), 0, u.item);
      return { ...s, shopAdded: list, toast: null, toastUndo: null };
    }
    case "unlog":
      return { ...s, logs: s.logs.filter((e) => e.id !== a.id) };
    case "tab":
      return { ...s, tab: a.tab, page: null, viewDate: null, learnNutrient: a.tab === "learn" ? s.learnNutrient : null, learnTopic: a.tab === "learn" ? s.learnTopic : null };
    case "learn":
      return { ...s, learnNutrient: a.nutrient, learnTopic: null, tab: "learn", page: null, viewDate: null, sheets: [] };
    case "learnTopic":
      return { ...s, learnTopic: a.topic, learnNutrient: null, tab: "learn", page: null, viewDate: null, sheets: [] };
    case "setting":
      return { ...s, [a.key]: a.value };
    case "periodEnabled":
      // Turning it off also forgets the current period: nothing is kept that isn't being used.
      return { ...s, periodEnabled: a.value, period: a.value ? s.period : null };
    case "periodLength": {
      const days = Math.min(10, Math.max(2, Math.round(a.days)));
      return { ...s, periodLength: days, period: s.period ? { ...s.period, lengthDays: days } : null };
    }
    case "periodStart":
      return { ...s, period: { startedOn: addDays(s.today, -a.daysAgo), lengthDays: s.periodLength } };
    case "periodEnd":
      return s.period ? { ...s, period: { ...s.period, endedOn: s.today } } : s;
    case "periodReopen": {
      if (!s.period) return s;
      const { endedOn: _ended, ...rest } = s.period;
      return { ...s, period: rest };
    }
    case "heavy":
      return { ...s, heavyPeriods: a.value };
    case "sheet":
      return { ...s, sheets: [...s.sheets, a.sheet] };
    case "closeSheet":
      return { ...s, sheets: s.sheets.slice(0, -1) };
    case "closeAllSheets":
      return { ...s, sheets: [] };
    case "seen":
      return s.seen.includes(a.id) ? s : { ...s, seen: [...s.seen, a.id] };
    case "mode":
      return { ...s, mode: a.mode };
    case "theme":
      return { ...s, theme: a.theme };
    case "toast":
      return { ...s, toast: a.text, toastUndo: null };
    case "toastUndo":
      return { ...s, toast: a.text, toastUndo: a.undo };
    case "choosing":
      return { ...s, choosing: a.ctx };
    case "reset":
      return { ...initialState(s.theme), showEnergy: s.showEnergy, showTips: s.showTips };
    case "demo": {
      const nutrients: RoundNutrient[] = [
        { nutrient: "iron", role: "focus" },
        { nutrient: "magnesium", role: "focus" },
        { nutrient: "calcium", role: "focus" },
      ];
      const round = newRound(1, DEMO_START, nutrients);
      const days = a.kind === "day9" || a.kind === "period" ? 9 : a.kind === "day14" ? 14 : a.kind === "day36" ? 36 : 42;
      const today = addDays(DEMO_START, days === 42 ? 42 : days - 1);
      const logs = seedHistory(DEMO_PROFILE, round, days);
      const seen: HintId[] = a.kind === "day9" ? ["first_log"] : ["first_log", "why_jar", "becoming_yours"];
      return {
        ...initialState(s.theme),
        showEnergy: s.showEnergy,
        showTips: s.showTips,
        // Period timing is a setting like the others, so it carries across demos; the period itself does not.
        periodEnabled: a.kind === "period" ? true : s.periodEnabled,
        periodLength: s.periodLength,
        heavyPeriods: s.heavyPeriods,
        period: a.kind === "period" ? { startedOn: addDays(today, -1), lengthDays: s.periodLength } : null,
        phase: a.kind === "end" ? "end" : "app",
        profile: DEMO_PROFILE,
        profileSet: true,
        answers: {},
        today,
        round,
        logs,
        seen,
        sample: true,
        seq: 1000,
      };
    }
  }
}

interface Store {
  state: AppState;
  dispatch: Dispatch<Action>;
}
const Ctx = createContext<Store | null>(null);

const SHOP_KEY = "tend.shopChecked";
const REMOVED_KEY = "tend.shopRemoved";
const CUSTOM_KEY = "tend.shopCustom";
const ADDED_KEY = "tend.shopAdded";

function load<T>(key: string, ok: (x: unknown) => x is T): T[] {
  try {
    const raw = window.localStorage.getItem(key);
    const v: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(v) ? v.filter(ok) : [];
  } catch {
    return [];
  }
}
function save(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage can be blocked; the list then lasts for the session only */
  }
}
const isStr = (x: unknown): x is string => typeof x === "string";
const isObj = (x: unknown): x is Record<string, unknown> => typeof x === "object" && x !== null;
const isCustom = (x: unknown): x is CustomItem => isObj(x) && isStr(x.id) && isStr(x.name) && x.name.length > 0 && x.name.length <= 60;
const isAdded = (x: unknown): x is AddedFood => isObj(x) && isStr(x.id) && isStr(x.name) && isStr(x.category) && (x.serving === undefined || isStr(x.serving));

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, () => ({
    ...initialState(),
    shopChecked: load(SHOP_KEY, isStr),
    shopRemoved: load(REMOVED_KEY, isStr),
    shopCustom: load(CUSTOM_KEY, isCustom),
    shopAdded: load(ADDED_KEY, isAdded),
  }));
  useEffect(() => save(SHOP_KEY, state.shopChecked), [state.shopChecked]);
  useEffect(() => save(REMOVED_KEY, state.shopRemoved), [state.shopRemoved]);
  useEffect(() => save(CUSTOM_KEY, state.shopCustom), [state.shopCustom]);
  useEffect(() => save(ADDED_KEY, state.shopAdded), [state.shopAdded]);
  const value = useMemo(() => ({ state, dispatch }), [state]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore(): Store {
  const v = useContext(Ctx);
  if (!v) throw new Error("StoreProvider missing");
  return v;
}

/** Narrowed access for screens that only render once a round exists. */
export function useRound(): RoundState {
  const { state } = useStore();
  if (!state.round) throw new Error("No round yet");
  return state.round;
}
