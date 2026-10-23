// The shopping list: built by the engine from her rotation, strong foods for her
// three, and pairing helpers. Ticks live in app state (and localStorage when allowed).
import { useEffect, useMemo, useRef, useState } from "react";
import { SHOPPING_COPY } from "../content";
import { shoppingList, type ShoppingItem } from "../engine";
import { useCtx } from "./ctx";
import { BackIcon, CatChip } from "./primitives";

/** Plain text for the clipboard: aisle headings, then one food per line. */
export function listText(groups: { aisle: string; items: ShoppingItem[] }[], checked: ReadonlySet<string>): string {
  const lines: string[] = [];
  for (const g of groups) {
    const items = g.items.filter((i) => !checked.has(i.food.id));
    if (!items.length) continue;
    if (lines.length) lines.push("");
    lines.push(g.aisle);
    for (const i of items) lines.push(i.food.name);
  }
  return lines.join("\n");
}

function Row({ item, on, onToggle }: { item: ShoppingItem; on: boolean; onToggle: () => void }) {
  const f = item.food;
  return (
    <li className={`shop-row${on ? " is-done" : ""}`}>
      <label className="shop-label">
        <input type="checkbox" className="shop-input" checked={on} onChange={onToggle} />
        <span className="shop-box" aria-hidden="true">
          <svg width="16" height="16" viewBox="0 0 20 20">
            <path d="M4.5 10.5l3.5 3.5 7.5-8" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
        <span className="shop-text">
          <span className="shop-top">
            <span className="shop-name">{f.name}</span>
            <span className="kind-tag">{SHOPPING_COPY.kinds[item.kind]}</span>
          </span>
          <span className="shop-meta">
            <CatChip category={f.category} />
            {f.serving ? <span className="food-serving">{f.serving.label}</span> : null}
          </span>
          <span className="shop-reason">{item.reason}</span>
        </span>
      </label>
    </li>
  );
}

export function Shopping() {
  const { state, dispatch, profile, round, today } = useCtx();
  const r = round!;
  const groups = useMemo(() => shoppingList(profile, r, state.logs, today), [profile, r, state.logs, today]);
  const checked = useMemo(() => new Set(state.shopChecked), [state.shopChecked]);
  const total = groups.reduce((n, g) => n + g.items.length, 0);
  const doneCount = groups.reduce((n, g) => n + g.items.filter((i) => checked.has(i.food.id)).length, 0);
  const [fallback, setFallback] = useState<string | null>(null);
  const box = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (fallback !== null) box.current?.select();
  }, [fallback]);

  const back = state.tab === "round" ? "Round" : "Today";
  const copy = () => {
    const text = listText(groups, checked) || listText(groups, new Set());
    setFallback(null);
    const fail = () => setFallback(text);
    try {
      if (!navigator.clipboard?.writeText) return fail();
      navigator.clipboard.writeText(text).then(
        () => dispatch({ t: "toast", text: "Copied the list." }),
        fail,
      );
    } catch {
      fail();
    }
  };

  return (
    <div className="screen">
      <button type="button" className="back-link" onClick={() => dispatch({ t: "page", page: null })}>
        <BackIcon />
        <span>{back}</span>
      </button>
      <h1 className="h1 h1--small">{SHOPPING_COPY.title}</h1>
      <p className="intro intro--tight">{SHOPPING_COPY.intro}</p>

      {total === 0 ? (
        <p className="empty">{SHOPPING_COPY.empty}</p>
      ) : (
        <>
          {groups.map((g, gi) => {
            // Ticked items settle at the bottom of their aisle; the order is otherwise the engine's.
            const items = [...g.items].sort((a, b) => Number(checked.has(a.food.id)) - Number(checked.has(b.food.id)));
            return (
              <section key={g.aisle} className="aisle" aria-labelledby={`aisle-${gi}`}>
                <h2 id={`aisle-${gi}`} className="h3 aisle-head">
                  {g.aisle}
                </h2>
                <ul className="list">
                  {items.map((i) => (
                    <Row key={i.food.id} item={i} on={checked.has(i.food.id)} onToggle={() => dispatch({ t: "shopToggle", foodId: i.food.id })} />
                  ))}
                </ul>
              </section>
            );
          })}
          <div className="shop-actions">
            <button type="button" className="btn btn--ghost" onClick={copy}>
              Copy list
            </button>
            {doneCount > 0 ? (
              <button type="button" className="text-btn" onClick={() => dispatch({ t: "shopClear" })}>
                Clear checked
              </button>
            ) : null}
          </div>
          {fallback !== null ? (
            <div className="copy-fallback" role="status">
              <label htmlFor="shop-copy" className="small">
                Your browser wouldn't copy it. Select the text below and copy it from here.
              </label>
              <textarea id="shop-copy" ref={box} className="input copy-box" readOnly value={fallback} rows={Math.min(14, fallback.split("\n").length + 1)} onFocus={(e) => e.currentTarget.select()} />
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}

