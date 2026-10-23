import { HINTS, type HintId } from "../content";
import { useStore } from "./store";

/** A single-sentence first-time moment. Tap to dismiss; never shown again. */
export function HintCard({ id, lead, onDismiss }: { id: HintId; lead?: string | undefined; onDismiss?: () => void }) {
  const { dispatch } = useStore();
  return (
    <div className="hint" role="note">
      <p className="hint-text">
        {lead ? <strong>{lead}. </strong> : null}
        {HINTS[id]}
      </p>
      <button type="button" className="hint-x" onClick={onDismiss ?? (() => dispatch({ t: "seen", id }))}>
        Got it
      </button>
    </div>
  );
}
