import { useState, type ReactNode } from "react";
import { ageOn, ALLERGENS, MIN_AGE, type Allergen, type DietPattern } from "@tend/core";
import { FREQUENCIES, SCREENER } from "../content";
import { useCtx } from "./ctx";
import { ALLERGEN_CHIPS } from "./format";
import { BackIcon, Segmented } from "./primitives";
import { PREGNANCY_LINE } from "./Today";

export function Screen({ step, title, intro, onBack, footer, children }: { step?: string; title: string; intro?: ReactNode; onBack?: () => void; footer: ReactNode; children: ReactNode }) {
  return (
    <div className="flow">
      <div className="flow-top">
        {onBack ? (
          <button type="button" className="icon-btn" onClick={onBack} aria-label="Back">
            <BackIcon />
          </button>
        ) : (
          <span className="icon-btn-space" />
        )}
        {step ? <p className="step">{step}</p> : null}
      </div>
      <div className="flow-body">
        <h1 className="h1">{title}</h1>
        {intro ? <p className="intro">{intro}</p> : null}
        {children}
      </div>
      <div className="flow-foot">{footer}</div>
    </div>
  );
}

const YEARS = Array.from({ length: 2008 - 1940 + 1 }, (_, i) => 2008 - i);
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function Radio<T extends string>({ name, legend, value, options, onChange }: { name: string; legend: string; value: T | null; options: { id: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <fieldset className="field">
      <legend className="legend">{legend}</legend>
      <div className="choices">
        {options.map((o) => (
          <label key={o.id} className="choice">
            <input type="radio" name={name} value={o.id} checked={value === o.id} onChange={() => onChange(o.id)} />
            <span>{o.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function About() {
  const { state, dispatch, profile, today } = useCtx();
  const [periods, setPeriods] = useState<boolean | null>(state.profileSet ? profile.menstruating : null);
  const hasDob = profile.birthYear > 0 && profile.birthMonth > 0;
  const age = hasDob ? ageOn(profile, today) : null;
  const under = age !== null && age < MIN_AGE;
  const pregnant = profile.status === "pregnant";
  const ready = hasDob && !under && (pregnant || periods !== null);

  const toggle = (a: Allergen) => {
    const has = profile.allergens.includes(a);
    dispatch({ t: "profile", patch: { allergens: has ? profile.allergens.filter((x) => x !== a) : [...profile.allergens, a] } });
  };

  return (
    <Screen
      step="Step 1 of 3"
      title="About you"
      intro="Tend uses this to set your marks. We keep your birth year and month only, never your full date of birth."
      onBack={() => dispatch({ t: "openGuide", from: "about" })}
      footer={
        <button
          type="button"
          className="btn btn--primary"
          disabled={!ready}
          onClick={() => {
            dispatch({ t: "profile", patch: { menstruating: pregnant ? false : (periods ?? true) } });
            dispatch({ t: "profileSet" });
            dispatch({ t: "phase", phase: "screener" });
          }}
        >
          Continue
        </button>
      }
    >
      <fieldset className="field">
        <legend className="legend">When were you born?</legend>
        <div className="row-2">
          <label className="select-wrap">
            <span className="sr">Birth year</span>
            <select className="input" value={profile.birthYear || ""} onChange={(e) => dispatch({ t: "profile", patch: { birthYear: Number(e.target.value) } })}>
              <option value="">Year</option>
              {YEARS.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </label>
          <label className="select-wrap">
            <span className="sr">Birth month</span>
            <select className="input" value={profile.birthMonth || ""} onChange={(e) => dispatch({ t: "profile", patch: { birthMonth: Number(e.target.value) } })}>
              <option value="">Month</option>
              {MONTHS.map((m, i) => (
                <option key={m} value={i + 1}>
                  {m}
                </option>
              ))}
            </select>
          </label>
        </div>
        {under ? (
          <p className="gentle" role="status">
            Tend is for adults 18 and over.
          </p>
        ) : null}
      </fieldset>

      <Radio
        name="status"
        legend="Which fits you right now?"
        value={profile.status}
        onChange={(v) => dispatch({ t: "profile", patch: { status: v, ...(v === "pregnant" ? { menstruating: false } : {}) } })}
        options={[
          { id: "none", label: "Not pregnant or breastfeeding" },
          { id: "pregnant", label: "Pregnant" },
          { id: "lactating", label: "Breastfeeding" },
        ]}
      />
      {pregnant ? <p className="care-line">{PREGNANCY_LINE}</p> : null}

      {!pregnant ? (
        <Radio
          name="periods"
          legend="Do you have periods right now?"
          value={periods === null ? null : periods ? "yes" : "no"}
          onChange={(v) => setPeriods(v === "yes")}
          options={[
            { id: "yes", label: "Yes" },
            { id: "no", label: "No" },
          ]}
        />
      ) : null}

      <Radio<DietPattern>
        name="diet"
        legend="How do you eat?"
        value={profile.diet}
        onChange={(v) => dispatch({ t: "profile", patch: { diet: v } })}
        options={[
          { id: "omnivore", label: "Everything" },
          { id: "pescatarian", label: "Pescatarian" },
          { id: "vegetarian", label: "Vegetarian" },
          { id: "vegan", label: "Vegan" },
        ]}
      />

      <fieldset className="field">
        <legend className="legend">Any allergies?</legend>
        <p className="small" style={{ marginTop: 0 }}>
          Tend never suggests these. Tap all that apply.
        </p>
        <div className="chips">
          {ALLERGENS.map((a) => (
            <button key={a} type="button" className="chip-toggle" aria-pressed={profile.allergens.includes(a)} onClick={() => toggle(a)}>
              {ALLERGEN_CHIPS[a]}
            </button>
          ))}
        </div>
      </fieldset>
    </Screen>
  );
}

export function Screener() {
  const { state, dispatch, profile } = useCtx();
  const qs = SCREENER.filter((q) => !(q.skipFor ?? []).includes(profile.diet) && !(q.omnivoreOnly && profile.diet !== "omnivore"));
  return (
    <Screen
      step="Step 2 of 3"
      title="How often do you have these?"
      intro="A rough idea is plenty. This only helps Tend suggest where to start."
      onBack={() => dispatch({ t: "phase", phase: "about" })}
      footer={
        <>
          <button type="button" className="btn btn--primary" onClick={() => dispatch({ t: "phase", phase: "choose" })}>
            Continue
          </button>
          <button type="button" className="btn btn--quiet" onClick={() => dispatch({ t: "phase", phase: "choose" })}>
            Skip for now
          </button>
        </>
      }
    >
      <div className="questions">
        {qs.map((q) => (
          <div key={q.id} className="question">
            <p className="q-text" id={`q-${q.id}`}>
              {q.q}
            </p>
            <Segmented
              label={q.q}
              value={(state.answers[q.id] ?? "") as (typeof FREQUENCIES)[number]["id"]}
              onChange={(v) => dispatch({ t: "answer", id: q.id, value: v })}
              options={FREQUENCIES.map((f) => ({ id: f.id, label: f.label }))}
            />
          </div>
        ))}
      </div>
    </Screen>
  );
}
