// One search for Browse and the Add food sheet: her curated foods first (they
// have servings), then the full library. The library is fetched on first use.
import { useCallback, useEffect, useState } from "react";
import { FOODS, libraryLoaded, loadLibrary, type ProtoFood } from "../engine";

export const SEARCH_CAP = 50;

const fold = (s: string) => s.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");

interface Indexed {
  food: ProtoFood;
  name: string;
}
const curatedIndex: Indexed[] = FOODS.map((food) => ({ food, name: fold(food.name) }));
let libraryIndex: Indexed[] = [];
let pending: Promise<void> | null = null;

function ensureLibrary(): Promise<void> {
  if (libraryLoaded() && libraryIndex.length) return Promise.resolve();
  pending ??= loadLibrary()
    .then((rows) => {
      libraryIndex = rows.map((food) => ({ food, name: fold(food.name) }));
    })
    .catch((e) => {
      pending = null;
      throw e;
    });
  return pending;
}

export type LibraryStatus = "idle" | "loading" | "ready" | "error";

/** Call `start()` on first focus or keystroke. */
export function useLibrary(): { status: LibraryStatus; start: () => void } {
  const [status, setStatus] = useState<LibraryStatus>(libraryIndex.length ? "ready" : "idle");
  const start = useCallback(() => {
    if (libraryIndex.length) return setStatus("ready");
    setStatus((s) => (s === "loading" || s === "ready" ? s : "loading"));
    ensureLibrary().then(
      () => setStatus("ready"),
      () => setStatus("error"),
    );
  }, []);
  // Foods logged earlier in the session may already have loaded the library.
  useEffect(() => {
    if (libraryIndex.length) setStatus("ready");
  }, []);
  return { status, start };
}

export interface SearchResult {
  curated: ProtoFood[];
  library: ProtoFood[];
  /** More matched than we show. */
  more: boolean;
}

/** Earlier and shorter matches first: "Salmon, Atlantic" before "Gravlax of salmon". */
function rank(list: Indexed[], tokens: string[]): Indexed[] {
  const first = tokens[0]!;
  // Whole words beat word starts beat the middle of a word: "Fish, salmon" before "Salmonberry".
  const score = (x: Indexed) => {
    const words = ` ${x.name.replace(/[^a-z0-9]+/g, " ")} `;
    if (words.startsWith(` ${first} `)) return 0;
    if (words.includes(` ${first} `)) return 1;
    return words.includes(` ${first}`) ? 2 : 3;
  };
  return list.sort((a, b) => score(a) - score(b) || a.name.length - b.name.length || a.name.localeCompare(b.name));
}

/** Case-insensitive; every word must match. Capped at SEARCH_CAP in total. */
export function searchFoods(query: string, libraryReady: boolean): SearchResult {
  const tokens = fold(query).split(/\s+/).filter(Boolean);
  if (!tokens.length) return { curated: [], library: [], more: false };
  const hit = (x: Indexed) => tokens.every((t) => x.name.includes(t));
  const c = rank(curatedIndex.filter(hit), tokens);
  const l = libraryReady ? rank(libraryIndex.filter(hit), tokens) : [];
  const curated = c.slice(0, SEARCH_CAP).map((x) => x.food);
  const library = l.slice(0, SEARCH_CAP - curated.length).map((x) => x.food);
  return { curated, library, more: c.length + l.length > SEARCH_CAP };
}
