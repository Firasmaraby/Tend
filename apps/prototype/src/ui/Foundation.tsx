// The daily foundation (protein), the optional energy line, and the full nutrient list.
// Protein is not a jar and not one of her three: it is a quiet baseline.
import { useEffect, useMemo, useState } from "react";
import { amountIn, isInRound, NUTRIENTS, type NutrientCode } from "@tend/core";
import { EXPLAINERS } from "../content";
import { allNutrients, energyToday, lookup, proteinToday, type NutrientRow } from "../engine";
import { useCtx } from "./ctx";
import { shortName, pct } from "./format";
import { HintCard } from "./Hint";
import { MarkBar, Segmented, Sheet, useCountUp } from "./primitives";

const num = (n: number) => Math.round(n).toLocaleString("en-CA");

/** Under the three jars: protein as a horizontal bar, with energy and the full list a tap away. */
export function Foundation() {
  const { state, dispatch, profile, today } = useCtx();
  const p = useMemo(() => proteinToday(profile, state.logs, today), [profile, state.logs, today]);
  const e = useMemo(() => energyToday(state.logs, today), [state.logs, today]);
  const grams = useCountUp(p.grams);
  const kcal = useCountUp(e.kcal);
  const mark = Math.round(p.mark);
  const text = `${p.hasUnknown ? "at least " : ""}${num(grams)} of ${mark} g`;
  const spoken = `${p.hasUnknown ? "at least " : ""}${num(p.grams)} of ${mark} grams`;
  return (
    <div className="foundation-wrap">
      <button type="button" className="foundation" aria-label={`Protein, ${spoken}. Tap for details.`} onClick={() => dispatch({ t: "sheet", sheet: { kind: "explainer", nutrient: "protein" } })}>
        <span className="foundation-top" aria-hidden="true">
          <span className="foundation-label">Protein</span>
          <span className="foundation-text">{text}</span>
        </span>
        <MarkBar coverage={p.grams / p.mark} max={1.25} thick markLabel />
      </button>
      {state.showEnergy ? (
        <p className="energy-line" aria-live="polite">
          {e.kcal === 0 && e.hasUnknown ? "Not listed yet" : `${e.hasUnknown ? "at least " : ""}${num(kcal)} kcal today`}
        </p>
      ) : null}
      <button type="button" className="text-btn see-all" onClick={() => dispatch({ t: "sheet", sheet: { kind: "all" } })}>
        See all nutrients
      </button>
    </div>
  );
}

/** 8.9, 14.4, 312: enough digits to read, no more. */
export function amountText(v: number, unit: string): string {
  const d = v >= 100 ? 0 : v >= 1 ? 1 : 2;
  return `${v.toLocaleString("en-CA", { maximumFractionDigits: d })} ${unit}`;
}
const bare = (v: number) => v.toLocaleString("en-CA", { maximumFractionDigits: v >= 100 ? 0 : v >= 1 ? 1 : 2 });

const GROUPS: { id: NutrientRow["group"]; title: string }[] = [
  { id: "hers", title: "Your three" },
  { id: "foundation", title: "Foundation" },
  { id: "locked", title: "Locked in" },
  { id: "other", title: "Everything else" },
];

export function AllNutrientsSheet({ onClose }: { onClose: () => void }) {
  const { state, dispatch, profile, round, today, order } = useCtx();
  const [view, setView] = useState<"today" | "round">("today");
  const rows = useMemo(() => (round ? allNutrients(profile, round, state.logs, today) : []), [profile, round, state.logs, today]);

  // The first time the sheet opens, show the tip; it is marked seen straight away so it appears once.
  const [firstTime] = useState(() => state.showTips && !state.seen.includes("all_nutrients"));
  const [hintOpen, setHintOpen] = useState(firstTime);
  useEffect(() => {
    if (firstTime) dispatch({ t: "seen", id: "all_nutrients" });
  }, [firstTime, dispatch]);

  // A round average over days with a missing value is a lower bound too.
  const unknownInRound = useMemo(() => {
    const out = new Set<NutrientCode>();
    if (!round) return out;
    for (const e of state.logs) {
      if (!isInRound(e.logDate, round) || e.logDate > today) continue;
      const f = lookup(e.foodId);
      for (const r of rows) if (!f || amountIn(f, r.nutrient, e.grams) === undefined) out.add(r.nutrient);
    }
    return out;
  }, [state.logs, round, today, rows]);

  return (
    <Sheet title="All nutrients" onClose={onClose} tall>
      <div className="add-controls">
        <Segmented
          label="Show"
          value={view}
          onChange={setView}
          options={[
            { id: "today", label: "Today" },
            { id: "round", label: "Round average" },
          ]}
        />
      </div>
      <div className="sheet-scroll">
        {hintOpen ? <HintCard id="all_nutrients" onDismiss={() => setHintOpen(false)} /> : null}
        {GROUPS.map((g) => {
          const list = rows.filter((r) => r.group === g.id);
          // Her three in the order she chose them.
          if (g.id === "hers") list.sort((a, b) => order.indexOf(a.nutrient) - order.indexOf(b.nutrient));
          if (!list.length) return null;
          return (
            <section key={g.id} className="nsection" aria-label={g.title}>
              <h3 className="eyebrow nsection-title">{g.title}</h3>
              <ul className="nlist">
                {list.map((r) => (
                  <NutrientLine key={r.nutrient} r={r} view={view} atLeast={view === "today" ? r.todayHasUnknown : unknownInRound.has(r.nutrient)} />
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </Sheet>
  );
}

function NutrientLine({ r, view, atLeast }: { r: NutrientRow; view: "today" | "round"; atLeast: boolean }) {
  const { dispatch } = useCtx();
  const unit = NUTRIENTS[r.nutrient].unit;
  const cov = view === "today" ? r.today : r.roundMean;
  const hasExplainer = !!EXPLAINERS[r.nutrient];
  const name = shortName(r.nutrient);
  const pctText = cov === undefined ? null : `${atLeast ? "at least " : ""}${pct(cov)}%`;
  const amount = cov === undefined ? "Builds as you log" : `${bare(cov * r.mark)} of ${amountText(r.mark, unit)}`;
  const body = (
    <>
      <span className="nrow-top">
        <span className="nrow-name">{name}</span>
        {pctText ? <span className="nrow-pct">{pctText}</span> : null}
      </span>
      <MarkBar coverage={cov ?? 0} max={1.5} />
      <span className="nrow-amt">{amount}</span>
      {r.nutrient === "vit_d" ? <span className="nrow-note">Food rarely gets you there. Ask your doctor.</span> : null}
    </>
  );
  const label = `${name}, ${pctText ?? "builds as you log"}, ${amount}`;
  return (
    <li>
      {hasExplainer ? (
        <button type="button" className="nrow" aria-label={`${label}. Tap for details.`} onClick={() => dispatch({ t: "sheet", sheet: { kind: "explainer", nutrient: r.nutrient } })}>
          {body}
        </button>
      ) : (
        <div className="nrow nrow--static">{body}</div>
      )}
    </li>
  );
}
