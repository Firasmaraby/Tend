import { useId, useState } from "react";
import { PROTEIN_DEFAULT_G_PER_KG } from "@tend/core";
import { SETTINGS_COPY } from "../content";
import { proteinToday } from "../engine";
import { useCtx } from "./ctx";
import { Sheet } from "./primitives";

const MIN_KG = 30;
const MAX_KG = 250;

function Toggle({ title, body, checked, onChange }: { title: string; body: string; checked: boolean; onChange: (v: boolean) => void }) {
  const id = useId();
  return (
    <div className="setting">
      <label className="switch">
        <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} aria-describedby={id} />
        <span className="switch-track" aria-hidden="true" />
        <span className="setting-title">{title}</span>
      </label>
      <p id={id} className="small setting-body">
        {body}
      </p>
    </div>
  );
}

export function SettingsSheet({ onClose }: { onClose: () => void }) {
  const { state, dispatch, profile, today } = useCtx();
  const kgId = useId();
  const rateId = useId();
  const [kg, setKg] = useState(profile.weightKg === undefined ? "" : String(profile.weightKg));
  const kgNum = Number(kg);
  const kgValid = kg.trim() !== "" && Number.isFinite(kgNum) && kgNum >= MIN_KG && kgNum <= MAX_KG;
  const rate = profile.proteinGPerKg ?? PROTEIN_DEFAULT_G_PER_KG;

  const onKg = (t: string) => {
    setKg(t);
    const n = Number(t);
    if (t.trim() === "") dispatch({ t: "profile", patch: { weightKg: undefined } });
    else if (Number.isFinite(n) && n >= MIN_KG && n <= MAX_KG) dispatch({ t: "profile", patch: { weightKg: n } });
  };
  const mark = Math.round(proteinToday(profile, [], today).mark);

  return (
    <Sheet title="Settings" onClose={onClose}>
      <Toggle title={SETTINGS_COPY.energyTitle} body={SETTINGS_COPY.energyBody} checked={state.showEnergy} onChange={(v) => dispatch({ t: "setting", key: "showEnergy", value: v })} />

      <div className="setting">
        <label htmlFor={kgId} className="setting-title setting-title--block">
          {SETTINGS_COPY.weightTitle}
        </label>
        <span className="gram-field gram-field--kg">
          <input id={kgId} className="input gram-input" type="number" inputMode="decimal" min={MIN_KG} max={MAX_KG} step="any" value={kg} onChange={(e) => onKg(e.target.value)} autoComplete="off" />
          <span className="gram-unit" aria-hidden="true">
            kg
          </span>
        </span>
        <p className="small setting-body">{SETTINGS_COPY.weightBody}</p>
        {kg.trim() !== "" && !kgValid ? <p className="small">Enter a weight from {MIN_KG} to {MAX_KG} kg to use it.</p> : null}
        {profile.weightKg !== undefined ? (
          <div className="rate">
            <label htmlFor={rateId} className="legend">
              {SETTINGS_COPY.proteinRate}: {rate.toFixed(1)} g
            </label>
            <input
              id={rateId}
              className="range"
              type="range"
              min={0.8}
              max={2.2}
              step={0.1}
              value={rate}
              aria-valuetext={`${rate.toFixed(1)} grams per kilogram`}
              onChange={(e) => dispatch({ t: "profile", patch: { proteinGPerKg: Math.round(Number(e.target.value) * 10) / 10 } })}
            />
            <div className="range-ticks" aria-hidden="true">
              <span>0.8</span>
              <span>2.2</span>
            </div>
            <p className="small">Your protein mark is {mark} g a day.</p>
          </div>
        ) : null}
      </div>

      <Toggle title={SETTINGS_COPY.tipsTitle} body={SETTINGS_COPY.tipsBody} checked={state.showTips} onChange={(v) => dispatch({ t: "setting", key: "showTips", value: v })} />

      <button type="button" className="btn btn--ghost setting-replay" onClick={() => dispatch({ t: "openGuide", from: "app" })}>
        {SETTINGS_COPY.replay}
      </button>
    </Sheet>
  );
}
