import { useMemo, useState, type ReactNode } from "react";
import { coverage, totalFor } from "@tend/core";
import { FOODS, lookup, marksFor } from "../engine";
import { Jar } from "./Jar";
import { DEMO_PROFILE, NEW_USER_TODAY, useStore } from "./store";
import { PlusIcon, Swatch } from "./primitives";

function IronDemo() {
  const lentils = FOODS.find((f) => f.name === "Lentils, cooked")!;
  const mark = marksFor(DEMO_PROFILE, NEW_USER_TODAY).iron.value;
  const share = useMemo(
    () => coverage(totalFor([{ id: "g", foodId: lentils.id, grams: lentils.serving!.grams, logDate: NEW_USER_TODAY }], "iron", lookup), mark),
    [lentils, mark],
  );
  const [filled, setFilled] = useState(false);
  const pctShare = Math.round(share * 100);
  return (
    <div className="guide-demo">
      <div className="guide-jar">
        <span className="jar-stage">
          <Jar coverage={filled ? share : 0} width={112} />
          {filled ? (
            <span className="gain-chip" aria-hidden="true">
              +{pctShare}% iron
            </span>
          ) : null}
        </span>
        <span className="jar-name">Iron</span>
        <span className="jar-pct">
          {pctShare === 0 || !filled ? "0% of mark" : `${pctShare}% of mark`}
        </span>
        <span className="jar-role">Mark: {Math.round(mark * 10) / 10} mg</span>
      </div>
      <div className="demo-food">
        <span className="demo-food-main">
          <span className="food-line">
            <Swatch category={lentils.category} />
            <span className="food-name">{lentils.name}</span>
          </span>
          <span className="food-serving">{lentils.serving!.label} · {lentils.serving!.grams} g</span>
        </span>
        <button type="button" className="add-btn" onClick={() => setFilled(true)} disabled={filled} aria-label="Add one serving of lentils">
          <PlusIcon />
        </button>
      </div>
      <p className="demo-line" aria-live="polite">
        {filled ? "One cup of lentils fills almost half your iron mark." : "Tap the plus to add lentils."}
      </p>
      {filled ? (
        <button type="button" className="btn btn--quiet" onClick={() => setFilled(false)}>
          Try again
        </button>
      ) : null}
    </div>
  );
}

function BellCurve() {
  // A normal curve of how much different women need. Pure decoration of an idea, no numbers.
  const pts: string[] = [];
  const area: string[] = [];
  const g = (x: number) => 150 - 120 * Math.exp(-((x - 150) ** 2) / (2 * 48 ** 2));
  for (let x = 10; x <= 310; x += 4) pts.push(`${x},${g(x).toFixed(1)}`);
  for (let x = 10; x <= 246; x += 4) area.push(`${x},${g(x).toFixed(1)}`);
  return (
    <svg className="bell" viewBox="0 0 320 200" role="img" aria-label="A bell curve of how much different women need. The average requirement is at the peak, your mark sits just above it, and the recommended amount is far out on the right.">
      <text x="310" y="16" textAnchor="end" className="bell-note">
        how much different women need
      </text>
      <polygon points={`10,150 ${area.join(" ")} 246,150`} className="bell-area" />
      <polyline points={pts.join(" ")} className="bell-line" />
      <line x1="10" x2="310" y1="150" y2="150" className="bell-axis" />
      <line x1="176" x2="176" y1={g(176)} y2="160" className="bell-mark" />
      <line x1="246" x2="246" y1={g(246)} y2="176" className="bell-rec" />
      <circle cx="150" cy="30" r="5.5" className="bell-dot" />
      <text x="138" y="36" textAnchor="end" className="bell-label">
        average requirement
      </text>
      <text x="176" y="172" textAnchor="middle" className="bell-label bell-label--mark">
        your mark
      </text>
      <text x="246" y="192" textAnchor="middle" className="bell-label">
        recommended amount
      </text>
    </svg>
  );
}

function RoundPreview() {
  const names: [string, number][] = [
    ["Iron", 0.9],
    ["Magnesium", 1.3],
    ["Calcium", 0.6],
  ];
  return (
    <div className="guide-demo">
      <div className="weeks" role="img" aria-label="Six weeks, from week one to week six">
        {[1, 2, 3, 4, 5, 6].map((w) => (
          <span key={w} className={`week${w >= 5 ? " week--late" : ""}`}>
            <span className="week-bar" />
            <span className="week-n">{w}</span>
          </span>
        ))}
      </div>
      <p className="eyebrow" style={{ textAlign: "center" }}>
        Weeks
      </p>
      <div className="jar-row" style={{ marginTop: 20 }}>
        {names.map(([n, c]) => (
          <div key={n} className="jar-col jar-col--static">
            <span className="jar-stage">
              <Jar coverage={c} width={70} />
            </span>
            <span className="jar-name">{n}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function Guide() {
  const { state, dispatch } = useStore();
  const [step, setStep] = useState(0);
  const done = () => dispatch({ t: "phase", phase: state.guideReturn });
  const fromLearn = state.guideReturn === "app";

  const cards: { eyebrow: string; title: ReactNode; body: ReactNode; extra?: ReactNode }[] = [
    {
      eyebrow: "How Tend works",
      title: <span className="display">Add, don't subtract.</span>,
      body: "Tend shows you which nutrients to focus on and the real foods that fill them. Nothing here counts down.",
      extra: (
        <div className="promise-jars" aria-hidden="true">
          <Jar coverage={0.35} width={64} markLabel={false} flat />
          <Jar coverage={0.8} width={64} markLabel={false} flat />
          <Jar coverage={1.15} width={64} markLabel={false} flat />
        </div>
      ),
    },
    { eyebrow: "Try it", title: <span className="display">Tap to add lentils.</span>, body: null, extra: <IronDemo /> },
    {
      eyebrow: "Your mark",
      title: <span className="display">Why the mark?</span>,
      body: "Recommended amounts are set high enough to cover almost everyone, so most women need less. Your mark sits near what women like you actually need, and never below the average requirement.",
      extra: <BellCurve />,
    },
    {
      eyebrow: "The round",
      title: <span className="display">Six weeks, three nutrients.</span>,
      body: "Three nutrients. Six weeks. Then they're locked in and you add three more.",
      extra: <RoundPreview />,
    },
  ];
  const c = cards[step]!;
  const last = step === cards.length - 1;

  return (
    <div className="flow guide">
      <div className="flow-top">
        <button type="button" className="text-btn" onClick={done}>
          {fromLearn ? "Close" : "Skip"}
        </button>
        <div className="dots" role="img" aria-label={`Card ${step + 1} of ${cards.length}`}>
          {cards.map((_, i) => (
            <span key={i} className={`dot${i === step ? " is-on" : ""}`} />
          ))}
        </div>
      </div>
      <div className="flow-body" key={step}>
        <p className="eyebrow">{c.eyebrow}</p>
        <h1 className="h1 h1--hero">{c.title}</h1>
        {c.body ? <p className="intro">{c.body}</p> : null}
        {c.extra}
      </div>
      <div className="flow-foot flow-foot--row">
        {step > 0 ? (
          <button type="button" className="btn btn--ghost" onClick={() => setStep(step - 1)}>
            Back
          </button>
        ) : null}
        <button type="button" className="btn btn--primary" onClick={() => (last ? done() : setStep(step + 1))}>
          {last ? (fromLearn ? "Done" : "Start") : "Next"}
        </button>
      </div>
    </div>
  );
}
