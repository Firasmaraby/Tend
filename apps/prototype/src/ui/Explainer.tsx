import { NUTRIENTS, referenceValues, type NutrientCode } from "@tend/core";
import { EXPLAINERS, markReason } from "../content";
import { marksFor, nutrientUnit } from "../engine";
import { shortName } from "./format";
import { useStore } from "./store";

const trim = (n: number) => String(Math.round(n * 100) / 100);

export function useMark(n: NutrientCode) {
  const { state } = useStore();
  const marks = marksFor(state.profile, state.today);
  const mark = marks[n];
  const values = referenceValues(n, state.profile, mark.band).values;
  return { mark, reason: markReason(mark, values.rda, values.ear), unit: nutrientUnit(n) };
}

/** "Your mark": the number, then where it comes from in plain words. */
export function MarkBlock({ nutrient }: { nutrient: NutrientCode }) {
  const { mark, reason, unit } = useMark(nutrient);
  return (
    <section className="panel panel--mark" aria-label="Your mark">
      <p className="eyebrow">Your mark</p>
      <p className="big-number">
        {trim(mark.value)}
        <span className="big-unit"> {unit} a day</span>
      </p>
      <p className="small">{reason}</p>
    </section>
  );
}

/** Three points plus the pairs, care and life-stage panels. */
export function ExplainerBody({ nutrient }: { nutrient: NutrientCode }) {
  const e = EXPLAINERS[nutrient];
  if (!e) return <p className="small">{NUTRIENTS[nutrient].name}</p>;
  return (
    <>
      <ul className="points">
        {e.points.map((p) => (
          <li key={p}>{p}</li>
        ))}
      </ul>
      <div className="panels">
        {e.pairs ? (
          <div className="panel">
            <p className="eyebrow">Works well with</p>
            <p>{e.pairs}</p>
          </div>
        ) : null}
        {e.lifeStage ? (
          <div className="panel">
            <p className="eyebrow">At your life stage</p>
            <p>{e.lifeStage}</p>
          </div>
        ) : null}
        {e.care ? (
          <div className="panel">
            <p className="eyebrow">Good to know</p>
            <p>{e.care}</p>
          </div>
        ) : null}
      </div>
    </>
  );
}

export const explainerTitle = (n: NutrientCode) => shortName(n);
