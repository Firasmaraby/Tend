import { useMemo, useState } from "react";
import { MIN_SERVING_SHARE, type NutrientCode } from "@tend/core";
import { sharesOf, useCtx, type ShareTable } from "./ctx";
import { servingWithGrams, pct, pillName, shortName } from "./format";
import { Swatch } from "./primitives";
import type { ProtoFood } from "../engine";

export function Browse() {
  const { dispatch, round, marks, pool, active, order } = useCtx();
  const mine = round ? order : [];
  const [sel, setSel] = useState<NutrientCode[]>([]);
  const [two, setTwo] = useState(false);

  const table = useMemo(() => {
    const rows: { food: ProtoFood; t: ShareTable }[] = [];
    for (const food of pool) {
      const t = sharesOf(food, marks);
      if (t) rows.push({ food, t });
    }
    return rows;
  }, [pool, marks]);

  const focus = sel.length ? sel : active;
  const list = useMemo(() => {
    const rows = table
      .map(({ food, t }) => {
        const sum = focus.reduce((a, n) => a + (t[n] ?? 0), 0);
        const hits = active.filter((n) => (t[n] ?? 0) >= MIN_SERVING_SHARE).length;
        return { food, t, sum, hits };
      })
      .filter((r) => r.sum > 0 && (!two || r.hits >= 2));
    return rows.sort((a, b) => b.sum - a.sum).slice(0, 40);
  }, [table, focus, two, active]);

  const toggle = (n: NutrientCode) => setSel((s) => (s.includes(n) ? s.filter((x) => x !== n) : [...s, n]));

  return (
    <div className="screen">
      <h1 className="h1 h1--small">Browse</h1>
      <p className="intro intro--tight">Foods that suit your eating pattern and allergies, sorted by how much they give the marks you pick.</p>
      <div className="chips" role="group" aria-label="Nutrients to browse">
        {mine.map((n) => (
          <button key={n} type="button" className="chip-toggle" aria-pressed={sel.includes(n)} onClick={() => toggle(n)}>
            {shortName(n)}
          </button>
        ))}
      </div>
      <label className="switch">
        <input type="checkbox" checked={two} onChange={(e) => setTwo(e.target.checked)} />
        <span className="switch-track" aria-hidden="true" />
        <span>Hits two of my three</span>
      </label>
      <ul className="list">
        {list.length === 0 ? <li className="empty">No foods match that mix yet. Try fewer filters.</li> : null}
        {list.map(({ food, t }) => (
          <li key={food.id} className="food-row">
            <button type="button" className="food-open" onClick={() => dispatch({ t: "sheet", sheet: { kind: "food", foodId: food.id } })}>
              <span className="food-line">
                <Swatch category={food.category} />
                <span className="food-name">{food.name}</span>
              </span>
              <span className="food-serving">{servingWithGrams(food)}</span>
              <span className="pills">
                {mine
                  .filter((n) => (t[n] ?? 0) >= 0.05)
                  .map((n) => (
                    <span key={n} className="pill">
                      {pillName(n)} {pct(t[n] ?? 0)}%
                    </span>
                  ))}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
