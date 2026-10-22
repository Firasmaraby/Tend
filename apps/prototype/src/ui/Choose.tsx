import { useMemo, useState } from "react";
import type { NutrientCode, RoundNutrient } from "@tend/core";
import { EXPLAINERS } from "../content";
import { pickable, suggestThree, type Pickable } from "../engine";
import { topFoods, useCtx } from "./ctx";
import { ExplainerBody } from "./Explainer";
import { foodShort, inlineName, ordinalWord, shortName } from "./format";
import { Chevron } from "./primitives";
import { Screen } from "./Onboarding";

const helps = (name: string) => (name.endsWith("s") ? "help" : "helps");

export function Choose() {
  const { state, dispatch, profile, today, marks, pool } = useCtx();
  const next = state.choosing;
  const lockedIn = next?.locked ?? [];
  const carried = next?.carried ?? null;
  const projects = next?.projects ?? [];
  const taken = useMemo(() => new Set<NutrientCode>([...lockedIn, ...(carried ? [carried] : []), ...projects]), [lockedIn, carried, projects]);
  const slots = 3 - (carried ? 1 : 0);
  const roundNo = state.round ? state.round.number + 1 : 1;

  const suggestions = useMemo(
    () =>
      suggestThree(profile, state.answers, today)
        .filter((s) => !taken.has(s.nutrient))
        .slice(0, slots),
    [profile, state.answers, today, taken, slots],
  );
  const rows = useMemo(() => {
    const all = pickable(profile, today).filter((r) => !taken.has(r.nutrient));
    const sug = suggestions.map((s) => s.nutrient);
    const rank = (r: Pickable) => (sug.includes(r.nutrient) ? sug.indexOf(r.nutrient) : r.status === "ok" ? 10 : r.status === "floor" ? 20 : 30);
    return [...all].sort((a, b) => rank(a) - rank(b));
  }, [profile, today, taken, suggestions]);

  const [picked, setPicked] = useState<NutrientCode[]>(() => suggestions.map((s) => s.nutrient));
  const [open, setOpen] = useState<NutrientCode[]>([]);
  const reasonOf = (n: NutrientCode) => suggestions.find((s) => s.nutrient === n)?.reason;

  const full = picked.length >= slots;
  const toggle = (n: NutrientCode) => setPicked((p) => (p.includes(n) ? p.filter((x) => x !== n) : p.length < slots ? [...p, n] : p));

  // Foods that sit in the top eight for two of her picks.
  const top8 = useMemo(() => {
    const m = new Map<NutrientCode, string[]>();
    for (const n of picked) m.set(n, topFoods(pool, marks, n, 8).map((x) => x.food.name));
    return m;
  }, [picked, pool, marks]);
  const overlaps = useMemo(() => {
    const out: { a: NutrientCode; b: NutrientCode; foods: string[] }[] = [];
    for (let i = 0; i < picked.length; i++)
      for (let j = i + 1; j < picked.length; j++) {
        const a = picked[i]!;
        const b = picked[j]!;
        const fb = new Set(top8.get(b) ?? []);
        const foods = (top8.get(a) ?? []).filter((x) => fb.has(x));
        if (foods.length) out.push({ a, b, foods });
      }
    return out.sort((x, y) => y.foods.length - x.foods.length).slice(0, 2);
  }, [picked, top8]);

  const confirm = () => {
    const nutrients: RoundNutrient[] = [
      ...lockedIn.map((n) => ({ nutrient: n, role: "locked" as const })),
      ...projects.map((n) => ({ nutrient: n, role: "project" as const })),
      ...(carried ? [{ nutrient: carried, role: "carried" as const }] : []),
      ...picked.map((n) => ({ nutrient: n, role: "focus" as const })),
    ];
    dispatch({ t: "startRound", nutrients });
  };

  return (
    <Screen
      step={next ? undefined : "Step 3 of 3"}
      title={next ? "Choose your next three" : "Choose your three"}
      intro={
        next
          ? "The nutrient that came with you is already in. Pick the rest, and the ones you reached stay locked in."
          : "These are suggestions based on what you told us. Swap any of them. You'll focus on these three for six weeks."
      }
      onBack={next ? () => dispatch({ t: "phase", phase: "end" }) : () => dispatch({ t: "phase", phase: "screener" })}
      footer={
        <>
          {overlaps.length ? (
            <div className="overlaps" aria-live="polite">
              {overlaps.map((o) => {
                const names = o.foods.slice(0, 2).map(foodShort);
                const joined = names.length === 2 ? `${names[0]} and ${names[1]!.replace(/ \d.*$/, "").toLowerCase()}` : names[0]!;
                return (
                  <p key={`${o.a}${o.b}`} className="overlap">
                    {joined} {names.length === 2 ? "help" : helps(names[0]!)} both of these.
                    <span className="overlap-n">
                      {" "}
                      {shortName(o.a)} and {inlineName(o.b)}
                    </span>
                  </p>
                );
              })}
            </div>
          ) : null}
          <button type="button" className="btn btn--primary" disabled={picked.length !== slots} onClick={confirm}>
            {picked.length === slots ? `Start round ${roundNo}` : `Pick ${slots - picked.length} more`}
          </button>
        </>
      }
    >
      {next && (lockedIn.length || carried) ? (
        <div className="carry-block">
          {carried ? (
            <div className="pick-card pick-card--fixed">
              <div className="pick-card-main">
                <span className="pick-title">{shortName(carried)}</span>
                <span className="pick-role">Carried from last round</span>
                <span className="pick-line">Not at the mark yet, so it comes with you. Already one of your three.</span>
              </div>
            </div>
          ) : null}
          {lockedIn.map((n) => (
            <div key={n} className="pick-card pick-card--fixed">
              <div className="pick-card-main">
                <span className="pick-title">{shortName(n)}</span>
                <span className="pick-role">Locked in</span>
                <span className="pick-line">Still tracked, and it stays in your suggestions.</span>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      <p className="count-line" aria-live="polite">
        {picked.length === slots ? `You've picked ${slots === 3 ? "three" : slots === 2 ? "two" : "one"}. Tap one to swap it out.` : `${picked.length} of ${slots} picked`}
      </p>

      <ul className="pick-list">
        {rows.map((r) => {
          const e = EXPLAINERS[r.nutrient];
          const on = picked.includes(r.nutrient);
          const isOpen = open.includes(r.nutrient);
          const ok = r.status === "ok";
          const blocked = !on && full;
          return (
            <li key={r.nutrient} className={`pick-card${on ? " is-on" : ""}${!ok ? " is-muted" : ""}`}>
              <div className="pick-card-row">
                {ok ? (
                  <button type="button" className="pick-card-main pick-toggle" aria-pressed={on} aria-disabled={blocked} onClick={() => (blocked ? undefined : toggle(r.nutrient))}>
                    <span className="pick-check" aria-hidden="true">
                      {on ? (
                        <svg width="16" height="16" viewBox="0 0 16 16">
                          <path d="M3 8.5l3.2 3L13 4.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      ) : null}
                    </span>
                    <span className="pick-text">
                      <span className="pick-title">{shortName(r.nutrient)}</span>
                      <span className="pick-line">{e?.line}</span>
                      {on && reasonOf(r.nutrient) ? <span className="pick-reason">{reasonOf(r.nutrient)}</span> : null}
                    </span>
                  </button>
                ) : (
                  <div className="pick-card-main">
                    <span className="pick-text">
                      <span className="pick-title">{shortName(r.nutrient)}</span>
                      <span className="pick-line">{e?.line}</span>
                      <span className="pick-note">{r.status === "floor" ? "Not enough foods in the library for your eating pattern yet" : "Not offered as one of your three"}</span>
                    </span>
                  </div>
                )}
                <button type="button" className="icon-btn" aria-expanded={isOpen} aria-label={`${isOpen ? "Hide" : "Show"} details for ${shortName(r.nutrient)}`} onClick={() => setOpen((o) => (o.includes(r.nutrient) ? o.filter((x) => x !== r.nutrient) : [...o, r.nutrient]))}>
                  <Chevron open={isOpen} />
                </button>
              </div>
              {isOpen ? (
                <div className="pick-detail">
                  <ExplainerBody nutrient={r.nutrient} />
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
      <p className="small" style={{ textAlign: "center" }}>
        {ordinalWord(roundNo) === "first" ? "Your first round is six weeks." : "Six weeks again."}
      </p>
    </Screen>
  );
}
