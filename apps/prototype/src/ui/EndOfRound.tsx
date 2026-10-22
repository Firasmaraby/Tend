import { useMemo } from "react";
import { ROUND_DAYS, type NutrientRoundResult } from "@tend/core";
import { endOfRound } from "../engine";
import { useCtx } from "./ctx";
import { foodShort, ordinalWord, pct, shortName } from "./format";
import { Jar } from "./Jar";
import { Swatch } from "./primitives";

function trajectory(weekly: (number | null)[]): string | null {
  const have = weekly.map((w, i) => ({ w, i })).filter((x): x is { w: number; i: number } => x.w !== null);
  if (have.length < 2) return null;
  const a = have[0]!;
  const b = have[have.length - 1]!;
  return `${pct(a.w)}% in week ${a.i + 1}, ${pct(b.w)}% by week ${b.i + 1}`;
}

export function EndOfRound() {
  const { state, dispatch, profile, round } = useCtx();
  const r = round!;
  const end = useMemo(() => endOfRound(profile, r, state.logs), [profile, r, state.logs]);
  const nextNo = r.number + 1;

  const message = (res: NutrientRoundResult): string => {
    const name = shortName(res.nutrient);
    if (res.outcome === "reached") return "Reached. Locked in.";
    if (res.outcome === "not_enough_data") {
      return res.noDataReason === "data_gap"
        ? "Many foods you logged don't list this nutrient yet, so there's no fair verdict, and nothing carries forward."
        : "Not enough logged days for a verdict, so nothing carries forward.";
    }
    const at = `${name} finished at ${pct(res.meanLogged)}% of your mark.`;
    if (end.close.carried === res.nutrient) return `${at} Not there yet, so it comes with you into round ${nextNo}.`;
    if (end.close.projects.includes(res.nutrient)) return `${at} It becomes a longer project, with different coaching.`;
    return `${at} It stays in your suggestions, locked in, so the foods keep helping.`;
  };

  const goNext = () => {
    dispatch({ t: "choosing", ctx: { carried: end.close.carried, locked: end.close.locked, projects: end.close.projects } });
    dispatch({ t: "phase", phase: "choose" });
  };

  const names = r.nutrients.map((n) => shortName(n.nutrient));
  const foods = end.rotation.slice(0, 6).map((x) => x.food);

  return (
    <div className="end">
      <div className="end-top">
        <p className="eyebrow end-rise">Round {r.number}</p>
        <h1 className="display-xl end-rise" style={{ animationDelay: "80ms" }}>
          Round {r.number} complete
        </h1>
        <p className="intro end-rise" style={{ animationDelay: "160ms" }}>
          You logged {end.loggedDays} of {ROUND_DAYS} days. Your verdict is based on the days you logged.
        </p>
      </div>

      <div className="end-shelf">
        <div className="end-jars">
          {end.results.map((res) => (
            <div key={res.nutrient} className="jar-col jar-col--static">
              <span className="jar-stage">
                <Jar coverage={res.meanLogged} width={86} />
              </span>
              <span className="jar-name">{shortName(res.nutrient)}</span>
              <span className="jar-pct">{res.outcome === "not_enough_data" ? "Not enough days to say" : `${pct(res.meanLogged)}% on average`}</span>
            </div>
          ))}
        </div>
        <div className="plank" aria-hidden="true" />
      </div>

      <ul className="verdicts">
        {end.results.map((res) => {
          const tr = res.outcome === "not_enough_data" ? null : trajectory(res.weekly);
          return (
            <li key={res.nutrient} className={`verdict verdict--${res.outcome}`}>
              <p className="verdict-name">{shortName(res.nutrient)}</p>
              <p className="verdict-msg">{message(res)}</p>
              {tr ? <p className="small verdict-tr">{tr}</p> : null}
            </li>
          );
        })}
      </ul>

      <section className="section" aria-labelledby="yours-h">
        <h2 id="yours-h" className="h2">
          The foods that became yours
        </h2>
        {end.rotation.length === 0 ? (
          <p className="small">Foods you have on four different days will gather here next round.</p>
        ) : (
          <ul className="list">
            {end.rotation.map(({ food, days }) => (
              <li key={food.id} className="rot-row">
                <span className="food-line">
                  <Swatch category={food.category} />
                  <span className="food-name">{food.name}</span>
                </span>
                <span className="food-serving">{days} different days</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="section" aria-labelledby="share-h">
        <h2 id="share-h" className="h2">
          Your share card
        </h2>
        <p className="small" style={{ marginTop: 0 }}>
          A preview of what you can share. Foods and nutrient names only, never numbers.
        </p>
        <div className="share-card">
          <p className="share-brand">Tend</p>
          <p className="share-title">My {ordinalWord(r.number)} round</p>
          <p className="share-names">{names.join("  ·  ")}</p>
          <ul className="share-foods">
            {foods.map((f) => (
              <li key={f.id}>{foodShort(f.name)}</li>
            ))}
          </ul>
          <p className="share-foot">Add, don't subtract.</p>
        </div>
      </section>

      <div className="end-cta">
        <button type="button" className="btn btn--primary" onClick={goNext}>
          Choose your next three
        </button>
      </div>
    </div>
  );
}
