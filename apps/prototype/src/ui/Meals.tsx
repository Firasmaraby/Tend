// Meals: the small control for tagging a log, and the repeat-a-meal buttons.
import { useMemo } from "react";
import { MEALS, type LogEntry, type Meal } from "@tend/core";
import { MEAL_LABEL, REPEAT_COPY } from "../content";
import { lookup, repeatableMeal } from "../engine";
import { useCtx } from "./ctx";
import { foodShort, mealNow } from "./format";

/** Four options, always visible, one tap. Same look as the other segmented controls. */
export function MealPick({ value, onChange, label = "Meal" }: { value: Meal | null; onChange: (m: Meal) => void; label?: string }) {
  return (
    <div className="seg seg--meal" role="group" aria-label={label}>
      {MEALS.map((m) => (
        <button key={m} type="button" className="seg-btn" aria-pressed={value === m} onClick={() => onChange(m)}>
          {MEAL_LABEL[m]}
        </button>
      ))}
    </div>
  );
}

function RepeatIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
      <path d="M4.5 9.5V8a3 3 0 0 1 3-3h7M12.5 2.5l2.5 2.5-2.5 2.5M15.5 10.5V12a3 3 0 0 1-3 3h-7M7.5 17.5L5 15l2.5-2.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** "Salmon, Lentils and Spinach": short names, unique, in the order she ate them. */
export function foodNames(entries: readonly LogEntry[], max = 4): string {
  const names: string[] = [];
  for (const e of entries) {
    const f = lookup(e.foodId);
    const n = f ? foodShort(f.name) : null;
    if (n && !names.includes(n)) names.push(n);
  }
  const shown = names.slice(0, max);
  const more = names.length - shown.length;
  return more > 0 ? `${shown.join(", ")} and ${more} more` : shown.join(", ");
}

/** Copy yesterday's entries for a meal onto today, with the usual toast. */
export function useRepeat() {
  const { dispatch, today } = useCtx();
  return (meal: Meal, from: LogEntry[]) => {
    if (!from.length) return;
    dispatch({ t: "repeat", from, date: today, meal, at: Date.now() });
    dispatch({ t: "toast", text: REPEAT_COPY.done(MEAL_LABEL[meal]) });
  };
}

/** A quiet button: the action, then what is in it. */
export function RepeatButton({ meal, entries, onRepeat }: { meal: Meal; entries: LogEntry[]; onRepeat: () => void }) {
  const names = foodNames(entries);
  return (
    <button type="button" className="repeat-btn" onClick={onRepeat}>
      <span className="repeat-title">
        <RepeatIcon />
        <span>{REPEAT_COPY.button(MEAL_LABEL[meal])}</span>
      </span>
      <span className="repeat-names">{names}</span>
    </button>
  );
}

/** Yesterday's meals she could repeat now (their meal is still empty today). */
export function useRepeatable(): { meal: Meal; entries: LogEntry[] }[] {
  const { state, today } = useCtx();
  return useMemo(
    () =>
      MEALS.map((meal) => ({ meal, entries: repeatableMeal(state.logs, today, meal) })).filter((x) => x.entries.length > 0),
    [state.logs, today],
  );
}

/** On Today: the current meal only. */
export function RepeatNow() {
  const { state, today } = useCtx();
  const repeat = useRepeat();
  const meal = mealNow();
  const entries = useMemo(() => repeatableMeal(state.logs, today, meal), [state.logs, today, meal]);
  if (!entries.length) return null;
  return <RepeatButton meal={meal} entries={entries} onRepeat={() => repeat(meal, entries)} />;
}
