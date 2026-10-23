import { useId } from "react";

export const GRAM_CHIPS = [50, 100, 150, 200] as const;
export const MIN_GRAMS = 5;
export const MAX_GRAMS = 1000;

/** A valid amount in grams, or null. */
export function parseGrams(text: string): number | null {
  const n = Number(text);
  return text.trim() !== "" && Number.isFinite(n) && n >= MIN_GRAMS && n <= MAX_GRAMS ? Math.round(n * 10) / 10 : null;
}

/**
 * Library foods have no serving, so she picks a weight: four chips for the
 * common amounts and a small field for anything else. One source of truth, the text.
 */
export function GramPicker({ text, setText, compact = false }: { text: string; setText: (t: string) => void; compact?: boolean }) {
  const id = useId();
  const valid = parseGrams(text) !== null;
  return (
    <div className="gram-picker">
      <div className="seg" role="group" aria-label="Amount in grams">
        {GRAM_CHIPS.map((g) => (
          <button key={g} type="button" className="seg-btn" aria-pressed={Number(text) === g} onClick={() => setText(String(g))}>
            {g} g
          </button>
        ))}
      </div>
      <div className="gram-custom">
        <label htmlFor={id} className="gram-label">
          Custom amount
        </label>
        <span className="gram-field">
          <input
            id={id}
            className="input gram-input"
            type="number"
            inputMode="decimal"
            min={MIN_GRAMS}
            max={MAX_GRAMS}
            step="any"
            value={text}
            onChange={(e) => setText(e.target.value)}
            aria-describedby={`${id}-help`}
            aria-invalid={!valid && text !== "" ? true : undefined}
          />
          <span className="gram-unit" aria-hidden="true">
            g
          </span>
        </span>
      </div>
      <p id={`${id}-help`} className={compact ? "sr" : "small gram-help"}>
        {valid ? "Any amount from 5 to 1000 g." : "Pick an amount from 5 to 1000 g."}
      </p>
    </div>
  );
}
