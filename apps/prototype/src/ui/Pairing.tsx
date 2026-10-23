// Better together: teaches, never quantifies. Nothing here changes a number.
import { useId, useMemo, useState } from "react";
import { HEME_CATEGORIES, PAIRING_RULES, type PairingMoment, type PairingRuleId } from "@tend/core";
import { PAIRING_COPY } from "../content";
import { helpersFor, pairingMoments, type ProtoFood } from "../engine";
import { useCtx } from "./ctx";
import { foodLower, foodShort, sentenceCase } from "./format";
import { PlusIcon } from "./primitives";

/** The pairing moments worth showing today: at most two, things to add before things to know. */
export function usePairingCards(): PairingMoment[] {
  const { state, profile, round, today } = useCtx();
  return useMemo(() => {
    if (!round) return [];
    const rank = (m: PairingMoment) => (PAIRING_RULES[m.rule].kind === "know" ? 2 : m.paired ? 1 : 0);
    return pairingMoments(profile, round, state.logs, today)
      .sort((a, b) => rank(a) - rank(b))
      .slice(0, 2);
  }, [profile, round, state.logs, today]);
}

/** One-tap "+ Red bell pepper" buttons: each logs one serving. */
export function HelperButtons({ rule, limit }: { rule: PairingRuleId; limit: number }) {
  const { dispatch, profile, today } = useCtx();
  const helpers = useMemo<ProtoFood[]>(() => helpersFor(profile, rule, limit), [profile, rule, limit]);
  if (!helpers.length) return null;
  return (
    <div className="helpers" role="group" aria-label="Add one serving">
      {helpers.map((h) => (
        <button
          key={h.id}
          type="button"
          className="helper-btn"
          aria-label={`Add one serving of ${h.name}`}
          onClick={() => dispatch({ t: "log", foodId: h.id, servings: 1, date: today, at: Date.now() })}
        >
          <PlusIcon />
          <span>{foodShort(h.name)}</span>
        </button>
      ))}
    </div>
  );
}

function Sparkle() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true" className="pair-spark">
      <path d="M9 2l1.7 4.6L15.5 8l-4.8 1.4L9 14l-1.7-4.6L2.5 8l4.8-1.4z" fill="currentColor" />
    </svg>
  );
}

export function PairingCard({ m }: { m: PairingMoment }) {
  const copy = PAIRING_COPY[m.rule];
  const kind = PAIRING_RULES[m.rule].kind;
  if (kind === "pair" && m.paired) {
    const food = foodLower(m.target.name);
    const helper = m.helper ? foodLower(m.helper.name) : "pairing";
    // The iron rule counts meat, fish and poultry as helpers too, but the shared line talks about vitamin C.
    const heme = m.rule === "iron_vitamin_c" && !!m.helper && HEME_CATEGORIES.has(m.helper.category);
    return (
      <p className="pair-done">
        <Sparkle />
        <span>{heme ? PAIRING_COPY.iron_vitamin_c.doneAnimal(food, helper) : copy.done(food, helper)}</span>
      </p>
    );
  }
  if (kind === "know") {
    return (
      <article className="pair-card pair-card--know">
        <h3 className="pair-title">{copy.title}</h3>
        <p className="pair-text">{copy.nudge(sentenceCase(foodShort(m.target.name)))}</p>
      </article>
    );
  }
  return (
    <article className="pair-card">
      <h3 className="pair-title">{copy.title}</h3>
      <p className="pair-text">{copy.nudge(foodLower(m.target.name))}</p>
      <HelperButtons rule={m.rule} limit={3} />
    </article>
  );
}

/** A small chip on a suggestion row. Tap for the tip and two foods that help. */
export function PairChip({ rule, food }: { rule: PairingRuleId; food: ProtoFood }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const copy = PAIRING_COPY[rule];
  return (
    <div className="food-extra">
      <button type="button" className="pair-chip" aria-expanded={open} aria-controls={id} onClick={() => setOpen((o) => !o)}>
        <span className="pair-chip-pill">{copy.chip}</span>
      </button>
      {open ? (
        <div id={id} className="pair-open">
          <p className="pair-text">{copy.nudge(foodLower(food.name))}</p>
          <HelperButtons rule={rule} limit={2} />
        </div>
      ) : null}
    </div>
  );
}
