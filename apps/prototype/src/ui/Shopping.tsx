// The shopping list: built by the engine from her rotation, strong foods for her
// three, and pairing helpers. She can take items off, type her own, or pick foods.
// Ticks, removals and her own items live in app state (and localStorage when allowed).
import { useEffect, useId, useMemo, useRef, useState, type FormEvent } from "react";
import type { FoodCategory } from "@tend/core";
import { SHOPPING_COPY, SHOPPING_EDIT_COPY } from "../content";
import { AISLE_ORDER, shoppingList, type Aisle, type ProtoFood, type ShoppingItem } from "../engine";
import { useCtx } from "./ctx";
import { foodShort } from "./format";
import { BackIcon, CatChip, CloseIcon } from "./primitives";
import type { CustomItem } from "./store";

/**
 * Same aisles as the engine's list. The engine keeps its map private, so this repeats it
 * for foods she picks herself (the two must stay in step).
 */
const AISLE: Partial<Record<FoodCategory, Aisle>> = {
  leafy_greens: "Produce", vegetables: "Produce", fruit: "Produce",
  legumes: "Beans, grains and seeds", grains: "Beans, grains and seeds", nuts_seeds: "Beans, grains and seeds", small_seeds: "Beans, grains and seeds",
  fish: "Fish and meat", shellfish: "Fish and meat", meat: "Fish and meat", poultry: "Fish and meat", organ_meat: "Fish and meat",
  milk: "Dairy and eggs", yogurt: "Dairy and eggs", cheese: "Dairy and eggs", eggs: "Dairy and eggs",
};
export const aisleOf = (c: FoodCategory): Aisle => AISLE[c] ?? "Pantry";

/** One line on the list, whichever way it got there. */
interface ListItem {
  /** Food id for foods; "own:..." for typed items. Ticks and removals are keyed by this. */
  key: string;
  name: string;
  origin: "made" | "food" | "own";
  category?: FoodCategory | undefined;
  serving?: string | undefined;
  reason?: string | undefined;
  kind?: ShoppingItem["kind"] | undefined;
}

type Group = { aisle: string; items: ListItem[] };

/** Plain text for the clipboard: her own items first, then aisle headings, one item per line. */
export function listText(own: ListItem[], groups: Group[], checked: ReadonlySet<string>): string {
  const lines: string[] = [];
  const block = (title: string, items: ListItem[]) => {
    const keep = items.filter((i) => !checked.has(i.key));
    if (!keep.length) return;
    if (lines.length) lines.push("");
    lines.push(title);
    for (const i of keep) lines.push(i.name);
  };
  block(SHOPPING_EDIT_COPY.yourItems, own);
  for (const g of groups) block(g.aisle, g.items);
  return lines.join("\n");
}

/** Pick-a-food-for-the-list, used by the Add food sheet. Quiet about repeats. */
export function useAddToList() {
  const { state, dispatch, profile, round, today } = useCtx();
  return (f: ProtoFood) => {
    const generated = round ? shoppingList(profile, round, state.logs, today).some((g) => g.items.some((i) => i.food.id === f.id)) : false;
    if (generated && state.shopRemoved.includes(f.id)) {
      dispatch({ t: "shopRestore", foodId: f.id });
      dispatch({ t: "toast", text: `Added ${foodShort(f.name)} to your list.` });
    } else if (generated || state.shopAdded.some((a) => a.id === f.id)) {
      dispatch({ t: "toast", text: `${foodShort(f.name)} is already on your list.` });
    } else {
      dispatch({ t: "shopAddFood", item: { id: f.id, name: f.name, category: f.category, ...(f.serving ? { serving: f.serving.label } : {}) } });
      dispatch({ t: "toast", text: `Added ${foodShort(f.name)} to your list.` });
    }
  };
}

function Row({ item, on, onToggle, onRemove }: { item: ListItem; on: boolean; onToggle: () => void; onRemove: () => void }) {
  return (
    <li className={`shop-row${on ? " is-done" : ""}`} data-key={item.key}>
      <label className="shop-label">
        <input type="checkbox" className="shop-input" checked={on} onChange={onToggle} />
        <span className="shop-box" aria-hidden="true">
          <svg width="16" height="16" viewBox="0 0 20 20">
            <path d="M4.5 10.5l3.5 3.5 7.5-8" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
        <span className="shop-text">
          <span className="shop-top">
            <span className="shop-name">{item.name}</span>
            {item.kind ? <span className="kind-tag">{SHOPPING_COPY.kinds[item.kind]}</span> : null}
          </span>
          {item.category ? (
            <span className="shop-meta">
              <CatChip category={item.category} />
              {item.serving ? <span className="food-serving">{item.serving}</span> : null}
            </span>
          ) : null}
          {item.reason ? <span className="shop-reason">{item.reason}</span> : null}
        </span>
      </label>
      <button type="button" className="shop-x" aria-label={`Remove ${item.name}`} onClick={onRemove}>
        <CloseIcon size={16} />
      </button>
    </li>
  );
}

const MAX_LEN = 60;
const ADDED_BY_YOU = "Added by you";

export function Shopping() {
  const { state, dispatch, profile, round, today } = useCtx();
  const r = round!;
  const generated = useMemo(() => shoppingList(profile, r, state.logs, today), [profile, r, state.logs, today]);
  const checked = useMemo(() => new Set(state.shopChecked), [state.shopChecked]);
  const removed = useMemo(() => new Set(state.shopRemoved), [state.shopRemoved]);

  // Everything on the list now: her own lines on top, then each aisle (her picks first, then ours).
  const own = useMemo<ListItem[]>(() => state.shopCustom.map((c) => ({ key: c.id, name: c.name, origin: "own" })), [state.shopCustom]);
  const { groups, hiddenCount } = useMemo(() => {
    const byAisle = new Map<string, ListItem[]>();
    const push = (aisle: string, it: ListItem) => byAisle.set(aisle, [...(byAisle.get(aisle) ?? []), it]);
    const madeIds = new Set(generated.flatMap((g) => g.items.map((i) => i.food.id)));
    for (const a of state.shopAdded) {
      if (madeIds.has(a.id)) continue;
      push(aisleOf(a.category), { key: a.id, name: a.name, origin: "food", category: a.category, serving: a.serving, reason: ADDED_BY_YOU });
    }
    let hidden = 0;
    for (const g of generated) {
      for (const i of g.items) {
        if (removed.has(i.food.id)) {
          hidden++;
          continue;
        }
        push(g.aisle, { key: i.food.id, name: i.food.name, origin: "made", category: i.food.category, serving: i.food.serving?.label, reason: i.reason, kind: i.kind });
      }
    }
    // Ticked items settle at the bottom of their aisle; the order is otherwise the engine's.
    const out: Group[] = AISLE_ORDER.filter((a) => byAisle.has(a)).map((aisle) => ({
      aisle,
      items: [...byAisle.get(aisle)!].sort((a, b) => Number(checked.has(a.key)) - Number(checked.has(b.key))),
    }));
    return { groups: out, hiddenCount: hidden };
  }, [generated, state.shopAdded, removed, checked]);

  const ownSorted = useMemo(() => [...own].sort((a, b) => Number(checked.has(a.key)) - Number(checked.has(b.key))), [own, checked]);
  const flat = useMemo(() => [...ownSorted, ...groups.flatMap((g) => g.items)], [ownSorted, groups]);
  const total = flat.length;
  const doneCount = flat.filter((i) => checked.has(i.key)).length;

  const [fallback, setFallback] = useState<string | null>(null);
  const box = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (fallback !== null) box.current?.select();
  }, [fallback]);

  // After a removal, keep her place: focus goes to the next item (or the add box when none is left).
  const addBox = useRef<HTMLInputElement>(null);
  const [focusKey, setFocusKey] = useState<string | null>(null);
  useEffect(() => {
    if (focusKey === null) return;
    const el = focusKey === "" ? addBox.current : document.querySelector<HTMLElement>(`[data-key="${CSS.escape(focusKey)}"] .shop-input`);
    el?.focus({ preventScroll: true });
    setFocusKey(null);
  }, [focusKey]);

  const remove = (it: ListItem) => {
    const i = flat.findIndex((x) => x.key === it.key);
    const next = flat[i + 1] ?? flat[i - 1];
    const text = SHOPPING_EDIT_COPY.removed(it.origin === "own" ? it.name : foodShort(it.name));
    if (it.origin === "made") {
      dispatch({ t: "shopRemove", foodId: it.key });
      dispatch({ t: "toastUndo", text, undo: { kind: "restore", foodId: it.key } });
    } else if (it.origin === "own") {
      const at = state.shopCustom.findIndex((c) => c.id === it.key);
      dispatch({ t: "shopRemoveCustom", id: it.key });
      dispatch({ t: "toastUndo", text, undo: { kind: "custom", item: state.shopCustom[at]!, at } });
    } else {
      const at = state.shopAdded.findIndex((a) => a.id === it.key);
      dispatch({ t: "shopRemoveFood", id: it.key });
      dispatch({ t: "toastUndo", text, undo: { kind: "food", item: state.shopAdded[at]!, at } });
    }
    setFocusKey(next?.key ?? "");
  };

  const [text, setText] = useState("");
  const addId = useId();
  const typed = text.trim().replace(/\s+/g, " ");
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!typed || typed.length > MAX_LEN) return;
    if (state.shopCustom.some((c) => c.name.toLowerCase() === typed.toLowerCase())) {
      dispatch({ t: "toast", text: `${typed} is already on your list.` });
    } else {
      const item: CustomItem = { id: `own:${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, name: typed };
      dispatch({ t: "shopAddCustom", item });
      dispatch({ t: "toast", text: `Added ${typed}.` });
    }
    setText("");
    addBox.current?.focus({ preventScroll: true });
  };

  const back = state.tab === "round" ? "Round" : "Today";
  const copy = () => {
    const text = listText(ownSorted, groups, checked) || listText(ownSorted, groups, new Set());
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

  const row = (i: ListItem) => <Row key={i.key} item={i} on={checked.has(i.key)} onToggle={() => dispatch({ t: "shopToggle", foodId: i.key })} onRemove={() => remove(i)} />;

  return (
    <div className="screen">
      <button type="button" className="back-link" onClick={() => dispatch({ t: "page", page: null })}>
        <BackIcon />
        <span>{back}</span>
      </button>
      <h1 className="h1 h1--small">{SHOPPING_COPY.title}</h1>
      <p className="intro intro--tight">{SHOPPING_COPY.intro}</p>

      <form className="shop-add" onSubmit={submit}>
        <label className="sr" htmlFor={addId}>
          {SHOPPING_EDIT_COPY.addPlaceholder}
        </label>
        <input
          ref={addBox}
          id={addId}
          className="input"
          type="text"
          placeholder={SHOPPING_EDIT_COPY.addPlaceholder}
          maxLength={MAX_LEN}
          autoComplete="off"
          enterKeyHint="done"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <button type="submit" className="btn btn--primary shop-add-btn" disabled={!typed}>
          {SHOPPING_EDIT_COPY.addButton}
        </button>
      </form>
      <button type="button" className="text-btn shop-pick" onClick={() => dispatch({ t: "sheet", sheet: { kind: "add", mode: "shopping" } })}>
        {SHOPPING_EDIT_COPY.addFromFoods}
      </button>

      {total === 0 ? (
        hiddenCount === 0 ? <p className="empty">{SHOPPING_COPY.empty}</p> : null
      ) : (
        <>
          {ownSorted.length ? (
            <section className="aisle" aria-labelledby="aisle-own">
              <h2 id="aisle-own" className="h3 aisle-head">
                {SHOPPING_EDIT_COPY.yourItems}
              </h2>
              <ul className="list">{ownSorted.map(row)}</ul>
            </section>
          ) : null}
          {groups.map((g, gi) => (
            <section key={g.aisle} className="aisle" aria-labelledby={`aisle-${gi}`}>
              <h2 id={`aisle-${gi}`} className="h3 aisle-head">
                {g.aisle}
              </h2>
              <ul className="list">{g.items.map(row)}</ul>
            </section>
          ))}
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
      {hiddenCount > 0 ? (
        <div className="shop-restore">
          <button type="button" className="text-btn" onClick={() => dispatch({ t: "shopRestoreAll" })}>
            {SHOPPING_EDIT_COPY.restoreAll}
          </button>
        </div>
      ) : null}
    </div>
  );
}
