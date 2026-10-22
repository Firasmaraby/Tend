import { useEffect, useMemo, useState } from "react";
import { coverage, totalFor, type NutrientCode } from "@tend/core";
import { EXPLAINERS } from "../content";
import { FOODS, lookup, pickable } from "../engine";
import { topFoods, useCtx } from "./ctx";
import { ExplainerBody, MarkBlock, useMark } from "./Explainer";
import { servingWithGrams, foodLower, fracText, pct, servingsText, shortName } from "./format";
import { Jar } from "./Jar";
import { BackIcon, Swatch } from "./primitives";

const MYTHS: Partial<Record<NutrientCode, string>> = {
  iron: "Cooked spinach and cooked lentils give about the same iron per cup. Spinach holds on to some of its iron, so your body absorbs less of it. Pairing either one with vitamin C helps.",
  epa_dha: "Chia isn't a stand-in for salmon. Plant and marine omega-3 work differently, so Tend tracks them separately.",
  ala: "Chia isn't a stand-in for salmon. Plant and marine omega-3 work differently, so Tend tracks them separately.",
};

export function Learn() {
  const { state, dispatch, profile, today } = useCtx();
  const n = state.learnNutrient;
  if (n) return <NutrientPage nutrient={n} />;
  const rows = pickable(profile, today);
  return (
    <div className="screen">
      <h1 className="h1 h1--small">Learn</h1>
      <button type="button" className="card card--link" onClick={() => dispatch({ t: "openGuide", from: "app" })}>
        <span className="card-title">How Tend works</span>
        <span className="card-sub">Four short cards. Replay them any time.</span>
      </button>
      <h2 className="h2">Nutrients</h2>
      <ul className="list">
        {rows.map((r) => (
          <li key={r.nutrient}>
            <button type="button" className="learn-row" onClick={() => dispatch({ t: "learn", nutrient: r.nutrient })}>
              <span className="learn-name">{shortName(r.nutrient)}</span>
              <span className="learn-line">{EXPLAINERS[r.nutrient]?.line}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function NutrientPage({ nutrient }: { nutrient: NutrientCode }) {
  const { dispatch, marks, pool } = useCtx();
  const e = EXPLAINERS[nutrient];
  const tops = useMemo(() => topFoods(pool, marks, nutrient, 10), [pool, marks, nutrient]);
  useEffect(() => window.scrollTo(0, 0), [nutrient]);
  const myth = MYTHS[nutrient];
  return (
    <div className="screen nutrient-page">
      <button type="button" className="back-link" onClick={() => dispatch({ t: "learn", nutrient: null })}>
        <BackIcon />
        <span>All nutrients</span>
      </button>
      <p className="eyebrow">{shortName(nutrient)}</p>
      <h1 className="headline">{e?.line}</h1>
      <ExplainerBody nutrient={nutrient} />
      <MarkBlock nutrient={nutrient} />
      {myth ? (
        <aside className="panel panel--myth">
          <p className="eyebrow">Myth, gently busted</p>
          <p>{myth}</p>
        </aside>
      ) : null}
      <section className="section">
        <h2 className="h2">Top foods for you</h2>
        {tops.length === 0 ? (
          <p className="small">Not enough foods in the library for your eating pattern yet.</p>
        ) : (
          <ol className="top-list">
            {tops.map(({ food, share }) => (
              <li key={food.id}>
                <button type="button" className="top-row" onClick={() => dispatch({ t: "sheet", sheet: { kind: "food", foodId: food.id } })}>
                  <span className="food-line">
                    <Swatch category={food.category} />
                    <span className="food-name">{food.name}</span>
                  </span>
                  <span className="food-serving">{servingWithGrams(food)}</span>
                  <span className="top-pct">{pct(share)}%</span>
                </button>
              </li>
            ))}
          </ol>
        )}
      </section>
      {tops.length ? <PortionSlider nutrient={nutrient} options={tops.map((t) => t.food.id)} /> : null}
    </div>
  );
}

function PortionSlider({ nutrient, options }: { nutrient: NutrientCode; options: string[] }) {
  const { marks, today } = useCtx();
  const { mark, unit } = useMark(nutrient);
  const [id, setId] = useState(options[0]!);
  const [mult, setMult] = useState(1);
  const food = lookup(id) ?? FOODS[0]!;
  const cov = useMemo(() => coverage(totalFor([{ id: "slider", foodId: food.id, grams: (food.serving?.grams ?? 0) * mult, logDate: today }], nutrient, lookup), marks[nutrient].value), [food, mult, nutrient, marks, today]);
  const reached = cov >= 0.995;
  const unknown = totalFor([{ id: "s", foodId: food.id, grams: 1, logDate: today }], nutrient, lookup).hasUnknown;
  return (
    <section className="section slider-card" aria-labelledby="slider-h">
      <h2 id="slider-h" className="h2">
        How much gets you there?
      </h2>
      <label className="legend" htmlFor="slider-food">
        Pick a food
      </label>
      <select id="slider-food" className="input" value={id} onChange={(e) => setId(e.target.value)}>
        {options.map((o) => (
          <option key={o} value={o}>
            {lookup(o)?.name}
          </option>
        ))}
      </select>
      <div className="slider-body">
        <Jar coverage={cov} width={84} />
        <div className="slider-text">
          <p className="slider-big" aria-live="polite">
            {unknown ? "Not listed for this food" : `${pct(cov)}% of your mark`}
          </p>
          <p className="small" style={{ margin: 0 }}>
            {unknown
              ? "This food doesn't list this nutrient, so Tend can't count it."
              : reached
                ? `${servingsText(mult)} of ${foodLower(food.name)} (${mult === 1 ? "" : `${fracText(mult)} × `}${food.serving?.label}) reaches your mark.`
                : `${servingsText(mult)} of ${foodLower(food.name)} gets you to ${pct(cov)}% of your mark. It adds up across the day.`}
          </p>
        </div>
      </div>
      <label className="legend" htmlFor="slider-range">
        Servings: {fracText(mult)}
      </label>
      <input id="slider-range" className="range" type="range" min={0.5} max={3} step={0.5} value={mult} aria-valuetext={servingsText(mult)} onChange={(e) => setMult(Number(e.target.value))} />
      <div className="range-ticks" aria-hidden="true">
        <span>½</span>
        <span>1</span>
        <span>1½</span>
        <span>2</span>
        <span>2½</span>
        <span>3</span>
      </div>
      <p className="small">
        Your mark is {Math.round(mark.value * 100) / 100} {unit}. Going past it is fine.
      </p>
    </section>
  );
}
