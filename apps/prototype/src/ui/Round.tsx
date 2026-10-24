import { useMemo } from "react";
import { addDays, isInRound, ROUND_DAYS } from "@tend/core";
import { EXPLAINERS, GLOSSARY, HISTORY_COPY } from "../content";
import { jars, loggedDayCount, rotation, roundDay } from "../engine";
import { useCtx } from "./ctx";
import { shortName } from "./format";
import { Swatch, Term } from "./primitives";

function Timeline() {
  const { state, today, round } = useCtx();
  const r = round!;
  const loggedDates = useMemo(() => new Set(state.logs.filter((e) => isInRound(e.logDate, r)).map((e) => e.logDate)), [state.logs, r]);
  const day = roundDay(r, today);
  const count = loggedDates.size;
  return (
    <div className="timeline" role="img" aria-label={`Six weeks. ${count} ${count === 1 ? "day" : "days"} logged so far, and you are on day ${day}.`}>
      {Array.from({ length: 6 }, (_, w) => (
        <div key={w} className={`tl-week${w >= 4 ? " tl-week--late" : ""}`}>
          <span className="tl-label">Week {w + 1}</span>
          <span className="tl-days">
            {Array.from({ length: 7 }, (_, d) => {
              const idx = w * 7 + d;
              const date = addDays(r.startedOn, idx);
              const on = loggedDates.has(date);
              const now = idx + 1 === day;
              return <span key={d} className={`tl-dot${on ? " is-logged" : ""}${now ? " is-today" : ""}`} />;
            })}
          </span>
        </div>
      ))}
    </div>
  );
}

function roleText(role: string) {
  if (role === "carried")
    return (
      <>
        <Term id="carried">Carried</Term> from last round
      </>
    );
  if (role === "locked")
    return (
      <>
        <Term id="locked in">Locked in</Term>
      </>
    );
  if (role === "project") return <>A longer project</>;
  return <>Focus</>;
}

export function RoundTab() {
  const { state, dispatch, profile, today, round, active } = useCtx();
  const r = round!;
  const day = roundDay(r, today);
  const week = Math.ceil(day / 7);
  const rot = useMemo(() => rotation(r, state.logs), [r, state.logs]);
  const logged = loggedDayCount(r, state.logs);
  const js = jars(profile, r, state.logs, today);

  // One idea for the week, taken from one of her three.
  const ideaFrom = active.filter((n) => EXPLAINERS[n]?.pairs);
  const idea = ideaFrom.length ? ideaFrom[(week - 1) % ideaFrom.length]! : null;
  const checkIn = day % 7 === 0 && day <= ROUND_DAYS;

  return (
    <div className="screen">
      <h1 className="h1 h1--small">Round {r.number}</h1>
      <p className="intro intro--tight">
        Week {week} of 6. A <Term id="round">round</Term> is six weeks with three nutrients. {logged === 1 ? "1 day logged." : `${logged} days logged.`}
      </p>
      <Timeline />
      <p className="small" style={{ marginTop: 8 }}>
        A filled dot is a day you logged. Every logged day counts.
      </p>

      <button type="button" className="card card--link" onClick={() => dispatch({ t: "page", page: "week" })}>
        <span className="card-title">{HISTORY_COPY.weekTitle}</span>
        <span className="card-sub">{HISTORY_COPY.weekIntro}</span>
      </button>

      {checkIn ? (
        <section className="card card--checkin" aria-labelledby="ci-h">
          <p className="eyebrow">Weekly check-in</p>
          <h2 id="ci-h" className="h2" style={{ marginTop: 4 }}>
            Week {week}, done
          </h2>
          <p>
            {rot.length
              ? `${rot[0]!.food.name} has been on your plate on ${rot[0]!.days} different days. It's becoming part of how you eat.`
              : "Foods you come back to will start to gather in your rotation."}
          </p>
          {idea ? (
            <p>
              <strong>One idea, for {shortName(idea).toLowerCase()}.</strong> {EXPLAINERS[idea]!.pairs}
            </p>
          ) : null}
          <p className="small">Your round is judged on the days you log, so every logged day counts.</p>
        </section>
      ) : null}

      {day >= 36 && day <= ROUND_DAYS ? (
        <section className="card card--late" aria-labelledby="w6-h">
          <p className="eyebrow">Week 6</p>
          <h2 id="w6-h" className="h2" style={{ marginTop: 4 }}>
            Your next three, coming up
          </h2>
          <p className="small" style={{ margin: 0 }}>
            When the round ends you'll see how it went, then choose three more. The ones you reached stay <Term id="locked in">locked in</Term>.
          </p>
        </section>
      ) : null}

      <section className="section" aria-labelledby="three-h">
        <h2 id="three-h" className="h2">
          Your three
        </h2>
        <ul className="list">
          {js.map((j) => (
            <li key={j.nutrient} className="three-row">
              <span className="three-name">{shortName(j.nutrient)}</span>
              <span className="three-role">{roleText(j.role)}</span>
              <span className="three-line">{EXPLAINERS[j.nutrient]?.line}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="section" aria-labelledby="rot-h">
        <h2 id="rot-h" className="h2">
          Your <Term id="rotation">rotation</Term>
        </h2>
        {rot.length === 0 ? (
          <p className="small">Foods you have on four different days gather here. They're how your marks fill without thinking.</p>
        ) : (
          <ul className="list">
            {rot.map(({ food, days }) => (
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

      <button type="button" className="card card--link" onClick={() => dispatch({ t: "page", page: "shopping" })}>
        <span className="card-title">Shopping list</span>
        <span className="card-sub">Your rotation, a few strong foods for your three, and what pairs well. Grouped by aisle.</span>
      </button>

      <section className="section" aria-labelledby="words-h">
        <h2 id="words-h" className="h2">
          Words we use
        </h2>
        <p className="small" style={{ marginTop: 0 }}>
          Tap any underlined word for a short definition.
        </p>
        <p className="words">
          {Object.keys(GLOSSARY).map((k) => (
            <Term key={k} id={k}>
              {k}
            </Term>
          ))}
        </p>
      </section>
    </div>
  );
}
