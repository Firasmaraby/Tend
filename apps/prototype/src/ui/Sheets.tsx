import { useEffect, useMemo, useRef, useState } from "react";
import { addDays, allergenWarnings, isInRound, NUTRIENT_CODES, rankable, type Meal, type NutrientCode } from "@tend/core";
import { EXPLAINERS, GLOSSARY, HINTS } from "../content";
import { allNutrients, FOODS, lookup, proteinToday, type ProtoFood } from "../engine";
import { AllNutrientsSheet } from "./Foundation";
import { GramPicker, parseGrams } from "./Amount";
import { rankedShares, sharesOf, sharesPer100, useCtx } from "./ctx";
import { ExplainerBody, MarkBlock } from "./Explainer";
import { ALLERGEN_SINGULAR, fracText, gramsText, kcalText, mealNow, pct, servingsText, servingWithGrams, shortName } from "./format";
import { HintCard } from "./Hint";
import { MealPick, RepeatButton, useRepeat, useRepeatable } from "./Meals";
import { CatChip, CheckIcon, PlusIcon, Segmented, Sheet, Swatch } from "./primitives";
import { searchFoods, useLibrary } from "./search";
import { SettingsSheet } from "./Settings";

export function SheetHost() {
  const { state, dispatch } = useCtx();
  return (
    <>
      {state.sheets.map((s, i) => {
        const close = () => dispatch({ t: "closeSheet" });
        const key = `${s.kind}${i}`;
        switch (s.kind) {
          case "explainer":
            return <ExplainerSheet key={key} nutrient={s.nutrient} onClose={close} />;
          case "glossary":
            return <GlossarySheet key={key} term={s.term} onClose={close} />;
          case "food":
            return <FoodSheet key={key} foodId={s.foodId} onClose={close} />;
          case "add":
            return <AddFoodSheet key={key} onClose={close} />;
          case "all":
            return <AllNutrientsSheet key={key} onClose={close} />;
          case "settings":
            return <SettingsSheet key={key} onClose={close} />;
        }
      })}
    </>
  );
}

function ExplainerSheet({ nutrient, onClose }: { nutrient: NutrientCode; onClose: () => void }) {
  const { state, dispatch, round, profile, today } = useCtx();
  const e = EXPLAINERS[nutrient];
  const row = round ? allNutrients(profile, round, state.logs, today).find((x) => x.nutrient === nutrient) : undefined;
  const isProtein = nutrient === "protein";
  return (
    <Sheet title={shortName(nutrient)} onClose={onClose}>
      <p className="lead">{e?.line}</p>
      {row ? (
        <p className="small" style={{ marginTop: 0 }}>
          {isProtein
            ? `Today: ${row.todayHasUnknown ? "at least " : ""}${Math.round(row.todayAmount)} of ${Math.round(row.mark)} g.`
            : `${row.todayHasUnknown ? "Today: at least " : "Today: "}${pct(row.today)}% of your mark.`}
        </p>
      ) : null}
      <ExplainerBody nutrient={nutrient} />
      {isProtein ? <ProteinMark /> : <MarkBlock nutrient={nutrient} />}
      {isProtein ? null : (
        <button type="button" className="btn btn--quiet" onClick={() => dispatch({ t: "learn", nutrient })}>
          More in Learn
        </button>
      )}
    </Sheet>
  );
}

/** Protein's mark comes from her profile, not the reference tables. Her weight is never shown. */
function ProteinMark() {
  const { profile, today } = useCtx();
  const mark = Math.round(proteinToday(profile, [], today).mark);
  const rate = profile.proteinGPerKg ?? 1.2;
  return (
    <section className="panel panel--mark" aria-label="Your mark">
      <p className="eyebrow">Your mark</p>
      <p className="big-number">
        {mark}
        <span className="big-unit"> g a day</span>
      </p>
      <p className="small">{profile.weightKg === undefined ? `Your mark is ${mark} g` : `Your mark is ${mark} g (${rate.toFixed(1)} g per kg)`}</p>
    </section>
  );
}

function GlossarySheet({ term, onClose }: { term: string; onClose: () => void }) {
  const def = GLOSSARY[term];
  return (
    <Sheet title={term.charAt(0).toUpperCase() + term.slice(1)} onClose={onClose}>
      <p className="lead">{def}</p>
    </Sheet>
  );
}

function FoodSheet({ foodId, onClose }: { foodId: string; onClose: () => void }) {
  const { state, dispatch, marks, order } = useCtx();
  const food = lookup(foodId);
  const library = !!food && !food.serving;
  const shares = useMemo(() => (food ? (library ? sharesPer100(food, marks) : sharesOf(food, marks)) : null), [food, library, marks]);
  const [grams, setGrams] = useState("100");
  const [meal, setMeal] = useState<Meal>(mealNow);
  if (!food) return null;
  const mine = order;
  // What the food advertises elsewhere leaves out poorly absorbed nutrients (spinach calcium).
  const advertised = rankedShares(food, shares);
  const others = NUTRIENT_CODES.filter((n) => !mine.includes(n) && (advertised[n] ?? 0) >= 0.2)
    .sort((a, b) => (advertised[b] ?? 0) - (advertised[a] ?? 0))
    .slice(0, 6);
  const amount = parseGrams(grams);
  const kcal = state.showEnergy ? kcalText(food, library ? 100 : food.serving!.grams) : null;
  const addLibrary = () => {
    if (amount === null) return;
    dispatch({ t: "log", foodId: food.id, servings: 1, grams: amount, date: state.today, at: Date.now(), meal });
    dispatch({ t: "toast", text: `Added ${gramsText(amount)} of ${food.name} to today` });
    onClose();
  };
  return (
    <Sheet title={food.name} onClose={onClose}>
      <p className="small" style={{ marginTop: 0 }}>
        <Swatch category={food.category} />
        {library ? "Values per 100 g" : `One serving: ${servingWithGrams(food)}`}
        {kcal ? ` · ${kcal}` : ""}
      </p>
      {library ? <p className="gentle">{HINTS.library_food}</p> : null}
      {mine.length ? (
        <>
          <h3 className="h3">{library ? "In 100 g, what it gives your marks" : "What it gives your marks"}</h3>
          <ul className="share-list">
            {mine.map((n) => {
              const s = shares?.[n];
              const muted = s !== undefined && !rankable(food, n);
              return (
                <li key={n} className={muted ? "is-muted" : undefined}>
                  <span className="share-name">{shortName(n)}</span>
                  {s === undefined ? (
                    <span className="share-val share-val--na">Not listed for this food</span>
                  ) : (
                    <>
                      <span className="bar" aria-hidden="true">
                        <span className={`bar-fill${muted ? " bar-fill--muted" : ""}`} style={{ width: `${Math.min(100, s * 100)}%` }} />
                      </span>
                      <span className="share-val">{pct(s)}%</span>
                      {muted ? <span className="share-note">Most of this {shortName(n).toLowerCase()} isn't absorbed (oxalate).</span> : null}
                    </>
                  )}
                </li>
              );
            })}
          </ul>
        </>
      ) : null}
      {others.length ? (
        <>
          <h3 className="h3">Also a good source of</h3>
          <p className="small">{others.map((n) => `${shortName(n)} ${pct(advertised[n] ?? 0)}%`).join(", ")}</p>
        </>
      ) : null}
      <p className="source">Source: {food.source.citation}</p>
      {library ? (
        <>
          <h3 className="h3 h3--tight">How much?</h3>
          <GramPicker text={grams} setText={setGrams} />
          <MealPick value={meal} onChange={setMeal} />
          <button type="button" className="btn btn--primary" disabled={amount === null} onClick={addLibrary}>
            {amount === null ? "Add to today" : `Add ${gramsText(amount)} to today`}
          </button>
        </>
      ) : (
        <>
          <MealPick value={meal} onChange={setMeal} />
          <button
            type="button"
            className="btn btn--primary"
            onClick={() => {
              dispatch({ t: "log", foodId: food.id, servings: 1, date: state.today, at: Date.now(), meal });
              dispatch({ t: "toast", text: `Added ${food.name} to today` });
              onClose();
            }}
          >
            Add to today
          </button>
        </>
      )}
    </Sheet>
  );
}

const STEPS = [0.5, 1, 1.5, 2];

/** One serving for a curated food, 100 g for a library food. */
const quickAmount = (f: ProtoFood) => (f.serving ? { servings: 1 } : { servings: 1, grams: 100 });

function AddFoodSheet({ onClose }: { onClose: () => void }) {
  const { state, dispatch, profile, today, round } = useCtx();
  const [q, setQ] = useState("");
  const [day, setDay] = useState<"today" | "yesterday">("today");
  const [picked, setPicked] = useState<ProtoFood | null>(null);
  const [mult, setMult] = useState(1);
  const [grams, setGrams] = useState("100");
  const [flash, setFlash] = useState<string | null>(null);
  const [meal, setMealState] = useState<Meal>(mealNow);
  const [mealTouched, setMealTouched] = useState(false);
  const repeat = useRepeat();
  const repeatable = useRepeatable();
  const flashTimer = useRef<number>(0);

  // The first time the sheet opens, show the tip; it is marked seen straight away so it appears once.
  const [firstTime] = useState(() => state.showTips && !state.seen.includes("meals"));
  const [hintOpen, setHintOpen] = useState(firstTime);
  useEffect(() => {
    if (firstTime) dispatch({ t: "seen", id: "meals" });
  }, [firstTime, dispatch]);
  const lib = useLibrary();
  const canYesterday = round ? addDays(today, -1) >= round.startedOn : false;
  const searching = q.trim() !== "";
  useEffect(() => () => window.clearTimeout(flashTimer.current), []);

  const { usuals, recent } = useMemo(() => {
    const days = new Map<string, Set<string>>();
    const counts = new Map<string, number>();
    for (const e of state.logs) {
      if (round && !isInRound(e.logDate, round)) continue;
      const s = days.get(e.foodId) ?? new Set<string>();
      s.add(e.logDate);
      days.set(e.foodId, s);
      counts.set(e.foodId, (counts.get(e.foodId) ?? 0) + 1);
    }
    const usualIds = [...days.entries()]
      .filter(([, s]) => s.size >= 2)
      .sort((a, b) => b[1].size - a[1].size || (counts.get(b[0]) ?? 0) - (counts.get(a[0]) ?? 0))
      .slice(0, 6)
      .map(([id]) => id);
    const recentIds: string[] = [];
    for (let i = state.logs.length - 1; i >= 0 && recentIds.length < 6; i--) {
      const id = state.logs[i]!.foodId;
      if (!recentIds.includes(id)) recentIds.push(id);
    }
    const pick = (ids: string[]) => ids.map((id) => lookup(id)).filter((f): f is ProtoFood => !!f);
    return { usuals: pick(usualIds), recent: pick(recentIds.filter((id) => !usualIds.includes(id))) };
  }, [state.logs, round]);

  const found = useMemo(() => searchFoods(q, lib.status === "ready"), [q, lib.status]);
  const all = useMemo(() => [...FOODS].sort((a, b) => a.name.localeCompare(b.name)), []);

  const date = day === "today" ? today : addDays(today, -1);
  const setMeal = (m: Meal) => {
    setMealState(m);
    setMealTouched(true);
  };
  // Today follows the clock; yesterday is most often dinner. Her own choice wins once she makes one.
  const changeDay = (d: "today" | "yesterday") => {
    setDay(d);
    if (!mealTouched) setMealState(d === "today" ? mealNow() : "dinner");
  };
  const pick = (f: ProtoFood) => {
    setPicked(f);
    setMult(1);
    setGrams("100");
  };
  const amount = parseGrams(grams);
  const add = () => {
    if (!picked) return;
    if (picked.serving) {
      dispatch({ t: "log", foodId: picked.id, servings: mult, date, at: Date.now(), meal });
      dispatch({ t: "toast", text: `Added ${picked.name} to ${day}` });
    } else {
      if (amount === null) return;
      dispatch({ t: "log", foodId: picked.id, servings: 1, grams: amount, date, at: Date.now(), meal });
      dispatch({ t: "toast", text: `Added ${gramsText(amount)} of ${picked.name} to ${day}` });
    }
    onClose();
  };
  const quick = (f: ProtoFood) => {
    dispatch({ t: "log", foodId: f.id, ...quickAmount(f), date, at: Date.now(), meal });
    dispatch({ t: "toast", text: `Added ${f.name} to ${day}` });
    setFlash(f.id);
    window.clearTimeout(flashTimer.current);
    flashTimer.current = window.setTimeout(() => setFlash(null), 1400);
  };

  const row = (f: ProtoFood, withQuick = false) => {
    const warn = allergenWarnings(f, profile);
    const sel = picked?.id === f.id;
    const isLib = !f.serving;
    const kcal = state.showEnergy ? kcalText(f, isLib ? 100 : f.serving!.grams) : null;
    return (
      <li key={f.id} className={withQuick ? "pick-line" : undefined}>
        <button type="button" className={`pick-row${sel ? " is-on" : ""}`} aria-pressed={sel} onClick={() => pick(f)}>
          <span className="pick-main">
            <Swatch category={f.category} />
            <span className="food-name">{f.name}</span>
          </span>
          <span className="food-serving">
            {isLib ? "Per 100 g" : servingWithGrams(f)}
            {kcal ? ` · ${kcal}` : ""}
          </span>
          {warn.length ? <span className="contains">Contains: {warn.map((a) => ALLERGEN_SINGULAR[a]).join(", ")}</span> : null}
        </button>
        {withQuick ? (
          <button type="button" className={`add-btn${flash === f.id ? " is-done" : ""}`} onClick={() => quick(f)} aria-label={`Add ${f.serving ? "one serving" : "100 g"} of ${f.name} to ${day}`}>
            {flash === f.id ? <CheckIcon /> : <PlusIcon />}
          </button>
        ) : null}
      </li>
    );
  };
  const libRow = (f: ProtoFood) => {
    const sel = picked?.id === f.id;
    const kcal = state.showEnergy ? kcalText(f, 100) : null;
    return (
      <li key={f.id}>
        <button type="button" className={`pick-row${sel ? " is-on" : ""}`} aria-pressed={sel} onClick={() => pick(f)}>
          <span className="pick-main">
            <Swatch category={f.category} />
            <span className="food-name">{f.name}</span>
          </span>
          <span className="food-serving">Per 100 g{kcal ? ` · ${kcal}` : ""}</span>
        </button>
      </li>
    );
  };

  const nothing = searching && found.curated.length === 0 && found.library.length === 0 && lib.status !== "loading";

  return (
    <Sheet title="Add food" onClose={onClose} tall>
      <div className="add-controls">
        <label className="sr" htmlFor="food-search">
          Search foods
        </label>
        <input
          id="food-search"
          className="input"
          type="search"
          placeholder="Search 5,900 foods"
          value={q}
          onFocus={lib.start}
          onChange={(e) => {
            setQ(e.target.value);
            lib.start();
          }}
          autoComplete="off"
        />
        {canYesterday ? (
          <Segmented
            label="Day"
            value={day}
            onChange={changeDay}
            options={[
              { id: "today", label: "Today" },
              { id: "yesterday", label: "Yesterday" },
            ]}
          />
        ) : null}
        <MealPick value={meal} onChange={setMeal} />
        {hintOpen ? <HintCard id="meals" onDismiss={() => setHintOpen(false)} /> : null}
      </div>
      <div className="add-list" aria-label="Foods">
        {searching ? (
          <>
            {found.curated.length ? <ul className="list">{found.curated.map((f) => row(f))}</ul> : null}
            {lib.status === "loading" ? (
              <p className="small search-status" role="status">
                Loading the full library...
              </p>
            ) : null}
            {lib.status === "error" ? (
              <p className="small search-status" role="status">
                The full library isn't available just now. Your own foods are still here.
              </p>
            ) : null}
            {found.library.length ? (
              <>
                <h3 className="subhead">From the full library</h3>
                <ul className="list">{found.library.map(libRow)}</ul>
              </>
            ) : null}
            {found.more ? <p className="small search-status">Keep typing to narrow it down</p> : null}
            {nothing ? <p className="empty">No foods match that yet.</p> : null}
          </>
        ) : (
          <>
            {day === "today" && repeatable.length ? (
              <>
                <h3 className="subhead subhead--first">Yesterday</h3>
                <ul className="list">
                  {repeatable.map(({ meal: m, entries }) => (
                    <li key={m} className="repeat-line">
                      <RepeatButton meal={m} entries={entries} onRepeat={() => repeat(m, entries)} />
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
            {usuals.length ? (
              <>
                <h3 className={`subhead${day === "today" && repeatable.length ? "" : " subhead--first"}`}>Your usuals</h3>
                <ul className="list">{usuals.map((f) => row(f, true))}</ul>
              </>
            ) : null}
            {recent.length ? (
              <>
                <h3 className={`subhead${usuals.length || (day === "today" && repeatable.length) ? "" : " subhead--first"}`}>Recent</h3>
                <ul className="list">{recent.map((f) => row(f, true))}</ul>
              </>
            ) : null}
            {usuals.length || recent.length ? <h3 className="subhead">All foods</h3> : null}
            <ul className="list">{all.map((f) => row(f))}</ul>
          </>
        )}
      </div>
      {picked ? (
        <div className="add-foot">
          <p className="add-picked">
            <strong>{picked.name}</strong>
            <span className="small"> {picked.serving ? servingWithGrams(picked) : "Per 100 g"}</span>
          </p>
          {picked.serving ? (
            <div className="seg" role="group" aria-label="How many servings">
              {STEPS.map((s) => (
                <button key={s} type="button" className="seg-btn" aria-pressed={mult === s} onClick={() => setMult(s)} aria-label={servingsText(s)}>
                  {fracText(s)}
                </button>
              ))}
            </div>
          ) : (
            <GramPicker text={grams} setText={setGrams} compact />
          )}
          <button type="button" className="btn btn--primary" onClick={add} disabled={!picked.serving && amount === null}>
            Add {picked.serving ? servingsText(mult) : amount === null ? "an amount" : gramsText(amount)} to {day}
          </button>
        </div>
      ) : null}
    </Sheet>
  );
}

