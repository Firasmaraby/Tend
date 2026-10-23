import { useMemo, useState } from "react";
import { allergenWarnings, MIN_SERVING_SHARE, type NutrientCode } from "@tend/core";
import { rankedShares, sharesOf, sharesPer100, useCtx, type ShareTable } from "./ctx";
import { ALLERGEN_SINGULAR, kcalText, servingWithGrams, pct, pillName, shortName } from "./format";
import { CatChip, Swatch } from "./primitives";
import { searchFoods, useLibrary } from "./search";
import type { ProtoFood } from "../engine";

export function Browse() {
  const { state, dispatch, profile, round, marks, pool, active, order } = useCtx();
  const mine = round ? order : [];
  const [sel, setSel] = useState<NutrientCode[]>([]);
  const [two, setTwo] = useState(false);
  const [q, setQ] = useState("");
  const lib = useLibrary();
  const searching = q.trim() !== "";

  const table = useMemo(() => {
    const rows: { food: ProtoFood; t: ShareTable }[] = [];
    for (const food of pool) {
      const t = sharesOf(food, marks);
      if (t) rows.push({ food, t: rankedShares(food, t) });
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

  const found = useMemo(() => searchFoods(q, lib.status === "ready"), [q, lib.status]);
  const nothing = searching && found.curated.length === 0 && found.library.length === 0 && lib.status !== "loading";

  const toggle = (n: NutrientCode) => setSel((s) => (s.includes(n) ? s.filter((x) => x !== n) : [...s, n]));
  const open = (id: string) => dispatch({ t: "sheet", sheet: { kind: "food", foodId: id } });

  return (
    <div className="screen">
      <h1 className="h1 h1--small">Browse</h1>
      <div className="search-box">
        <label className="sr" htmlFor="browse-search">
          Search foods
        </label>
        <input
          id="browse-search"
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
      </div>

      {searching ? (
        <div aria-label="Search results">
          {found.curated.length ? (
            <ul className="list">
              {found.curated.map((food) => {
                const t = rankedShares(food, sharesOf(food, marks));
                const warn = allergenWarnings(food, profile);
                const kcal = state.showEnergy ? kcalText(food, food.serving?.grams ?? 100) : null;
                return (
                  <li key={food.id} className="food-row">
                    <button type="button" className="food-open" onClick={() => open(food.id)}>
                      <span className="food-line">
                        <Swatch category={food.category} />
                        <span className="food-name">{food.name}</span>
                      </span>
                      <span className="food-serving">
                        {servingWithGrams(food)}
                        {kcal ? ` · ${kcal}` : ""}
                      </span>
                      <span className="pills">
                        {mine
                          .filter((n) => (t?.[n] ?? 0) >= 0.05)
                          .map((n) => (
                            <span key={n} className="pill">
                              {pillName(n)} {pct(t?.[n] ?? 0)}%
                            </span>
                          ))}
                        {warn.length ? <span className="contains">Contains: {warn.map((a) => ALLERGEN_SINGULAR[a]).join(", ")}</span> : null}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : null}
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
              <h2 className="subhead">From the full library</h2>
              <ul className="list">
                {found.library.map((food) => {
                  const t = rankedShares(food, sharesPer100(food, marks));
                  const kcal = state.showEnergy ? kcalText(food, 100) : null;
                  return (
                    <li key={food.id} className="food-row">
                      <button type="button" className="food-open" onClick={() => open(food.id)}>
                        <span className="food-line">
                          <Swatch category={food.category} />
                          <span className="food-name">{food.name}</span>
                        </span>
                        <span className="food-serving">Per 100 g{kcal ? ` · ${kcal}` : ""}</span>
                        <span className="pills">
                          <CatChip category={food.category} />
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
                  );
                })}
              </ul>
            </>
          ) : null}
          {found.more ? <p className="small search-status">Keep typing to narrow it down</p> : null}
          {nothing ? <p className="empty">No foods match that yet.</p> : null}
        </div>
      ) : (
        <>
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
            {list.map(({ food, t }) => {
              const kcal = state.showEnergy ? kcalText(food, food.serving?.grams ?? 100) : null;
              return (
                <li key={food.id} className="food-row">
                  <button type="button" className="food-open" onClick={() => open(food.id)}>
                    <span className="food-line">
                      <Swatch category={food.category} />
                      <span className="food-name">{food.name}</span>
                    </span>
                    <span className="food-serving">
                      {servingWithGrams(food)}
                      {kcal ? ` · ${kcal}` : ""}
                    </span>
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
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
