// Period timing: opt-in, quiet, and never about absence. It leans suggestions toward iron
// on her period days and turns the iron pairing tips on. It never changes a mark.
import { useEffect, useId, useRef, useState } from "react";
import { PERIOD_COPY } from "../content";
import { useCtx } from "./ctx";
import { PlusIcon, Segmented, Sheet, Toggle } from "./primitives";

const MIN_DAYS = 2;
const MAX_DAYS = 10;

/** A drop drawn in code: calm leaf green, never red. */
export function DropGlyph({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" focusable="false" className="period-drop">
      <path d="M12 3c3.5 4.2 6 7.3 6 10.3a6 6 0 0 1-12 0C6 10.3 8.5 7.2 12 3z" fill="currentColor" />
      <path d="M9.3 13.6a3 3 0 0 0 2.1 2.7" fill="none" stroke="var(--surface)" strokeWidth="1.5" strokeLinecap="round" opacity=".85" />
    </svg>
  );
}

function InfoGlyph() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <circle cx="12" cy="12" r="8.6" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <path d="M12 11v5.2" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
      <circle cx="12" cy="7.9" r="1.15" fill="currentColor" />
    </svg>
  );
}

function MinusIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
      <path d="M4 10h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

/** Heavy periods? Yes / No / Skip. Kept only to show a calm care line. */
export function HeavyQuestion() {
  const { state, dispatch } = useCtx();
  const [skipped, setSkipped] = useState(false);
  const value = state.heavyPeriods === true ? "yes" : state.heavyPeriods === false ? "no" : skipped ? "skip" : "none";
  const set = (v: "yes" | "no" | "skip" | "none") => {
    setSkipped(v === "skip");
    dispatch({ t: "heavy", value: v === "yes" ? true : v === "no" ? false : null });
  };
  return (
    <div className="heavy">
      <p className="q-text">{PERIOD_COPY.heavyQuestion}</p>
      <Segmented
        label={PERIOD_COPY.heavyQuestion}
        value={value}
        onChange={set}
        options={[
          { id: "yes", label: "Yes" },
          { id: "no", label: "No" },
          { id: "skip", label: "Skip" },
        ]}
      />
      {state.heavyPeriods === true ? <p className="care-line">{PERIOD_COPY.heavyNote}</p> : null}
    </div>
  );
}

function LengthStepper() {
  const { state, dispatch } = useCtx();
  const id = useId();
  const days = state.periodLength;
  const set = (d: number) => dispatch({ t: "periodLength", days: d });
  return (
    <div className="stepper-row">
      <span className="stepper-label" id={id}>
        {PERIOD_COPY.lengthLabel}
      </span>
      <div className="stepper" role="group" aria-labelledby={id}>
        <button type="button" className="step-btn" aria-label="One day fewer" disabled={days <= MIN_DAYS} onClick={() => set(days - 1)}>
          <MinusIcon />
        </button>
        <output className="step-val" aria-live="polite">
          {days} days
        </output>
        <button type="button" className="step-btn" aria-label="One day more" disabled={days >= MAX_DAYS} onClick={() => set(days + 1)}>
          <PlusIcon />
        </button>
      </div>
    </div>
  );
}

/** The Settings section. Only for someone who has periods and isn't pregnant. */
export function PeriodSettings() {
  const { state, dispatch, periodEligible } = useCtx();
  if (!periodEligible) return null;
  return (
    <Toggle title={PERIOD_COPY.settingTitle} body={PERIOD_COPY.settingBody} checked={state.periodEnabled} onChange={(v) => dispatch({ t: "periodEnabled", value: v })}>
      {state.periodEnabled ? <LengthStepper /> : null}
      <HeavyQuestion />
    </Toggle>
  );
}

/** The opt-in under "Do you have periods right now?" on About you. Off until she turns it on. */
export function PeriodOptIn() {
  const { state, dispatch } = useCtx();
  return (
    <div className="optin">
      <Toggle title={PERIOD_COPY.settingTitle} body={PERIOD_COPY.onboardingOffer} checked={state.periodEnabled} onChange={(v) => dispatch({ t: "periodEnabled", value: v })} />
      <HeavyQuestion />
    </div>
  );
}

// When she taps "My period started" the button goes away, so the card takes focus once.
let focusCardNext = false;

/** Today, on a day that isn't a period day. Quiet text buttons, always the same, never a nudge. */
export function PeriodStart() {
  const { state, dispatch, periodEligible, periodActive } = useCtx();
  if (!state.periodEnabled || !periodEligible || periodActive) return null;
  const start = (daysAgo: 0 | 1) => {
    focusCardNext = true;
    dispatch({ t: "periodStart", daysAgo });
    dispatch({ t: "toast", text: "Noted. Iron gets extra attention in your suggestions." });
  };
  return (
    <div className="period-start">
      <button type="button" className="text-btn" onClick={() => start(0)}>
        {PERIOD_COPY.start}
      </button>
      <button type="button" className="text-btn text-btn--soft" onClick={() => start(1)}>
        {PERIOD_COPY.startYesterday}
      </button>
    </div>
  );
}

/** Today, on a period day: a soft card with the day, a why button, and a way to end it. */
export function PeriodCard() {
  const { state, dispatch, today, periodActive, periodDayNo } = useCtx();
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    if (focusCardNext) {
      focusCardNext = false;
      ref.current?.focus();
    }
  }, []);
  const period = state.period;
  if (!periodActive || !period || periodDayNo === null) return null;
  const endedToday = period.endedOn === today;
  return (
    <section className="period-card" aria-label={PERIOD_COPY.settingTitle} ref={ref} tabIndex={-1}>
      <div className="period-row">
        <DropGlyph />
        <p className="period-line">{PERIOD_COPY.todayLine(periodDayNo)}</p>
        <button type="button" className="icon-btn period-info" aria-label="Why iron gets extra attention on period days" onClick={() => dispatch({ t: "sheet", sheet: { kind: "period" } })}>
          <InfoGlyph />
        </button>
      </div>
      <div className="period-foot">
        {endedToday ? <p className="period-ended">Noted. Suggestions go back to usual tomorrow.</p> : null}
        <button
          type="button"
          className="text-btn period-end"
          onClick={() => {
            if (endedToday) dispatch({ t: "periodReopen" });
            else dispatch({ t: "periodEnd" });
          }}
        >
          {endedToday ? "Undo" : PERIOD_COPY.end}
        </button>
      </div>
    </section>
  );
}

/** Why period days lean toward iron. Calm, and clear that the mark doesn't change. */
export function PeriodSheet({ onClose }: { onClose: () => void }) {
  const { state, dispatch, round } = useCtx();
  const ironHers = !!round?.nutrients.some((n) => n.nutrient === "iron");
  return (
    <Sheet title={PERIOD_COPY.settingTitle} onClose={onClose}>
      <p className="period-why">{PERIOD_COPY.why}</p>
      {!ironHers ? <p className="period-why period-why--note">{PERIOD_COPY.ironNotHers}</p> : null}
      {state.heavyPeriods === true ? <p className="care-line">{PERIOD_COPY.heavyNote}</p> : null}
      <button
        type="button"
        className="btn btn--quiet"
        onClick={() => dispatch({ t: "sheet", sheet: { kind: "settings" } })}
      >
        Period settings
      </button>
    </Sheet>
  );
}
