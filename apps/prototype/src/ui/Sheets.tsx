import { useMemo, useState } from "react";
import { addDays, allergenWarnings, NUTRIENT_CODES, type NutrientCode } from "@tend/core";
import { GLOSSARY } from "../content";
import { FOODS, jars, lookup, type ProtoFood } from "../engine";
import { EXPLAINERS } from "../content";
import { sharesOf, useCtx } from "./ctx";
import { ExplainerBody, MarkBlock } from "./Explainer";
import { servingWithGrams, ALLERGEN_SINGULAR, fracText, pct, servingsText, shortName } from "./format";
import { Segmented, Sheet, Swatch } from "./primitives";

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
        }
      })}
    </>
  );
}

function ExplainerSheet({ nutrient, onClose }: { nutrient: NutrientCode; onClose: () => void }) {
  const { state, dispatch, round } = useCtx();
  const e = EXPLAINERS[nutrient];
  const j = round ? jars(state.profile, round, state.logs, state.today).find((x) => x.nutrient === nutrient) : undefined;
  return (
    <Sheet title={shortName(nutrient)} onClose={onClose}>
      <p className="lead">{e?.line}</p>
      {j ? (
        <p className="small" style={{ marginTop: 0 }}>
          {j.todayHasUnknown ? "Today: at least " : "Today: "}
          {pct(j.today)}% of your mark.
        </p>
      ) : null}
      <ExplainerBody nutrient={nutrient} />
      <MarkBlock nutrient={nutrient} />
      <button type="button" className="btn btn--quiet" onClick={() => dispatch({ t: "learn", nutrient })}>
        More in Learn
      </button>
    </Sheet>
  );
}

function GlossarySheet({ term, onClose }: { term: string; onClose: () => void }) {
  const def = GLOSSARY[term];
  return (
    <Sheet title={term.charAt(0).toUpperCase() + term.slice(1)} onClose={onClose}>
      <p className="lead">{def ?? ""}</p>
    </Sheet>
  );
}

function FoodSheet({ foodId, onClose }: { foodId: string; onClose: () => void }) {
  const { state, dispatch, marks, order } = useCtx();
  const food = lookup(foodId);
  const shares = useMemo(() => (food ? sharesOf(food, marks) : null), [food, marks]);
  if (!food) return null;
  const mine = order;
  const others = NUTRIENT_CODES.filter((n) => !mine.includes(n) && (shares?.[n] ?? 0) >= 0.2)
    .sort((a, b) => (shares?.[b] ?? 0) - (shares?.[a] ?? 0))
    .slice(0, 6);
  return (
    <Sheet title={food.name} onClose={onClose}>
      <p className="small" style={{ marginTop: 0 }}>
        <Swatch category={food.category} />
        One serving: {servingWithGrams(food)}
      </p>
      {mine.length ? (
        <>
          <h3 className="h3">What it gives your marks</h3>
          <ul className="share-list">
            {mine.map((n) => {
              const s = shares?.[n];
              return (
                <li key={n}>
                  <span className="share-name">{shortName(n)}</span>
                  {s === undefined ? (
                    <span className="share-val share-val--na">Not listed for this food</span>
                  ) : (
                    <>
                      <span className="bar" aria-hidden="true">
                        <span className="bar-fill" style={{ width: `${Math.min(100, s * 100)}%` }} />
                      </span>
                      <span className="share-val">{pct(s)}%</span>
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
          <p className="small">{others.map((n) => `${shortName(n)} ${pct(shares?.[n] ?? 0)}%`).join(", ")}</p>
        </>
      ) : null}
      <p className="source">Source: {food.source.citation}</p>
      <button
        type="button"
        className="btn btn--primary"
        onClick={() => {
          dispatch({ t: "log", foodId: food.id, servings: 1, date: state.today, at: Date.now() });
          dispatch({ t: "toast", text: `Added ${food.name} to today` });
          onClose();
        }}
      >
        Add to today
      </button>
    </Sheet>
  );
}

const STEPS = [0.5, 1, 1.5, 2];

function AddFoodSheet({ onClose }: { onClose: () => void }) {
  const { state, dispatch, profile, today, round } = useCtx();
  const [q, setQ] = useState("");
  const [day, setDay] = useState<"today" | "yesterday">("today");
  const [picked, setPicked] = useState<ProtoFood | null>(null);
  const [mult, setMult] = useState(1);
  const canYesterday = round ? addDays(today, -1) >= round.startedOn : false;

  const usual = useMemo(() => {
    const c = new Map<string, number>();
    for (const e of state.logs) c.set(e.foodId, (c.get(e.foodId) ?? 0) + 1);
    return c;
  }, [state.logs]);

  const results = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const list = needle ? FOODS.filter((f) => f.name.toLowerCase().includes(needle)) : [...FOODS];
    return list.sort((a, b) => (usual.get(b.id) ?? 0) - (usual.get(a.id) ?? 0) || a.name.localeCompare(b.name));
  }, [q, usual]);

  const add = () => {
    if (!picked) return;
    const date = day === "today" ? today : addDays(today, -1);
    dispatch({ t: "log", foodId: picked.id, servings: mult, date, at: Date.now() });
    dispatch({ t: "toast", text: `Added ${picked.name} to ${day}` });
    onClose();
  };

  return (
    <Sheet title="Add food" onClose={onClose} tall>
      <div className="add-controls">
        <label className="sr" htmlFor="food-search">
          Search foods
        </label>
        <input id="food-search" className="input" type="search" placeholder="Search foods" value={q} onChange={(e) => setQ(e.target.value)} autoComplete="off" />
        {canYesterday ? (
          <Segmented
            label="Day"
            value={day}
            onChange={setDay}
            options={[
              { id: "today", label: "Today" },
              { id: "yesterday", label: "Yesterday" },
            ]}
          />
        ) : null}
      </div>
      <ul className="list add-list" aria-label="Foods">
        {results.length === 0 ? <li className="empty">No foods match that yet.</li> : null}
        {results.map((f) => {
          const warn = allergenWarnings(f, profile);
          const sel = picked?.id === f.id;
          return (
            <li key={f.id}>
              <button type="button" className={`pick-row${sel ? " is-on" : ""}`} aria-pressed={sel} onClick={() => (setPicked(f), setMult(1))}>
                <span className="pick-main">
                  <Swatch category={f.category} />
                  <span className="food-name">{f.name}</span>
                </span>
                <span className="food-serving">{servingWithGrams(f)}</span>
                {warn.length ? <span className="contains">Contains: {warn.map((a) => ALLERGEN_SINGULAR[a]).join(", ")}</span> : null}
              </button>
            </li>
          );
        })}
      </ul>
      {picked ? (
        <div className="add-foot">
          <p className="add-picked">
            <strong>{picked.name}</strong>
            <span className="small"> {servingWithGrams(picked)}</span>
          </p>
          <div className="seg" role="group" aria-label="How many servings">
            {STEPS.map((s) => (
              <button key={s} type="button" className="seg-btn" aria-pressed={mult === s} onClick={() => setMult(s)} aria-label={servingsText(s)}>
                {fracText(s)}
              </button>
            ))}
          </div>
          <button type="button" className="btn btn--primary" onClick={add}>
            Add {servingsText(mult)} to {day}
          </button>
        </div>
      ) : null}
    </Sheet>
  );
}

