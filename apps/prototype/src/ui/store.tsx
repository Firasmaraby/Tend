// App state. One reducer, one context. Nothing here does nutrition maths:
// that all comes from @tend/core via ../engine.
import { createContext, useContext, useEffect, useMemo, useReducer, type ReactNode, type Dispatch } from "react";
import { addDays, asLocalDate, nextRoundStart, type LocalDate, type LogEntry, type Meal, type NutrientCode, type Profile, type RoundNutrient } from "@tend/core";
import { lookup, newRound, seedHistory, type RoundState } from "../engine";
import type { HintId } from "../content";

export type Phase = "guide" | "about" | "screener" | "choose" | "app" | "end";
export type Tab = "today" | "browse" | "learn" | "round";
export type Theme = "auto" | "light" | "dark";
/** A full screen that sits over the current tab (with its own back link). */
export type Page = "shopping";
export type DemoKind = "day9" | "day14" | "day36" | "end";

export type SheetSpec =
  | { kind: "explainer"; nutrient: NutrientCode }
  | { kind: "add" }
  | { kind: "food"; foodId: string }
  | { kind: "glossary"; term: string }
  | { kind: "all" }
  | { kind: "settings" };

export interface NextRoundContext {
  carried: NutrientCode | null;
  locked: NutrientCode[];
  projects: NutrientCode[];
}

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
  /** Shopping list ticks, by food id. Kept in localStorage when it is available. */
  shopChecked: string[];
  learnNutrient: NutrientCode | null;
  /** A Learn page that isn't a nutrient. */
  learnTopic: "pairing" | null;
  /** Opt-in energy (DECISIONS.md 17): off by default. */
  showEnergy: boolean;
  /** Once-only tips: on by default. */
  showTips: boolean;
  sheets: SheetSpec[];
  seen: HintId[];
  mode: "serving" | "density";
  sample: boolean;
  choosing: NextRoundContext | null;
  theme: Theme;
  toast: string | null;
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
    shopChecked: [],
    learnNutrient: null,
    learnTopic: null,
    showEnergy: false,
    showTips: true,
    sheets: [],
    seen: [],
    mode: "serving",
    sample: false,
    choosing: null,
    theme,
    toast: null,
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
  | { t: "repeat"; from: LogEntry[]; date: LocalDate; meal: Meal; at: number }
  | { t: "page"; page: Page | null }
  | { t: "shopToggle"; foodId: string }
  | { t: "shopClear" }
  | { t: "setting"; key: "showEnergy" | "showTips"; value: boolean }
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
        return { id, foodId: e.foodId, grams: e.grams, logDate: a.date, meal: a.meal };
      });
      return { ...s, seq, logs: [...s.logs, ...copies], addedAt: added };
    }
    case "page":
      return { ...s, page: a.page, sheets: [] };
    case "shopToggle":
      return { ...s, shopChecked: s.shopChecked.includes(a.foodId) ? s.shopChecked.filter((x) => x !== a.foodId) : [...s.shopChecked, a.foodId] };
    case "shopClear":
      return { ...s, shopChecked: [] };
    case "unlog":
      return { ...s, logs: s.logs.filter((e) => e.id !== a.id) };
    case "tab":
      return { ...s, tab: a.tab, page: null, learnNutrient: a.tab === "learn" ? s.learnNutrient : null, learnTopic: a.tab === "learn" ? s.learnTopic : null };
    case "learn":
      return { ...s, learnNutrient: a.nutrient, learnTopic: null, tab: "learn", page: null, sheets: [] };
    case "learnTopic":
      return { ...s, learnTopic: a.topic, learnNutrient: null, tab: "learn", page: null, sheets: [] };
    case "setting":
      return { ...s, [a.key]: a.value };
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
      return { ...s, toast: a.text };
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
      const days = a.kind === "day9" ? 9 : a.kind === "day14" ? 14 : a.kind === "day36" ? 36 : 42;
      const today = addDays(DEMO_START, days === 42 ? 42 : days - 1);
      const logs = seedHistory(DEMO_PROFILE, round, days);
      const seen: HintId[] = a.kind === "day9" ? ["first_log"] : ["first_log", "why_jar", "becoming_yours"];
      return {
        ...initialState(s.theme),
        showEnergy: s.showEnergy,
        showTips: s.showTips,
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

function loadChecked(): string[] {
  try {
    const raw = window.localStorage.getItem(SHOP_KEY);
    const v: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, () => ({ ...initialState(), shopChecked: loadChecked() }));
  useEffect(() => {
    try {
      window.localStorage.setItem(SHOP_KEY, JSON.stringify(state.shopChecked));
    } catch {
      /* storage can be blocked; the ticks then last for the session only */
    }
  }, [state.shopChecked]);
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
