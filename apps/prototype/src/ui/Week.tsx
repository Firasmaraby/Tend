// Your week: which foods carried each of her three over the last seven days, and the
// seven days themselves, newest first. An unlogged day is just a date, never a gap to fill.
import { useMemo } from "react";
import { HISTORY_COPY } from "../content";
import { recentDays, weekCarriers } from "../engine";
import { useCtx } from "./ctx";
import { capFirst, dateShort, foodLower, inlineName, pct, shortName, weekdayLong } from "./format";
import { foodNames } from "./Meals";
import { BackIcon, MarkBar } from "./primitives";

const NOTHING_YET = "Nothing logged with this one yet.";

export function Week() {
  const { state, dispatch, profile, round, today } = useCtx();
  const r = round!;
  const carriers = useMemo(() => weekCarriers(r, state.logs, today), [r, state.logs, today]);
  const days = useMemo(() => recentDays(profile, r, state.logs, today, 7), [profile, r, state.logs, today]);
  const names = r.nutrients.map((n) => shortName(n.nutrient));

  return (
    <div className="screen">
      <button type="button" className="back-link" onClick={() => dispatch({ t: "page", page: null })}>
        <BackIcon />
        <span>Round</span>
      </button>
      <h1 className="h1 h1--small">{HISTORY_COPY.weekTitle}</h1>
      <p className="intro intro--tight">{HISTORY_COPY.weekIntro}</p>

      <section className="section section--tight" aria-labelledby="carry-h">
        <h2 id="carry-h" className="h2">
          What carried your three
        </h2>
        {carriers.map((c) => (
          <div key={c.nutrient} className="carry">
            <h3 className="carry-name">{shortName(c.nutrient)}</h3>
            {c.top.length ? (
              <ul className="carry-list">
                {c.top.map((t) => (
                  <li key={t.food.id}>{HISTORY_COPY.carried(capFirst(foodLower(t.food.name)), pct(t.share), inlineName(c.nutrient))}</li>
                ))}
              </ul>
            ) : (
              <p className="small carry-none">{NOTHING_YET}</p>
            )}
          </div>
        ))}
      </section>

      <section className="section" aria-labelledby="days-h">
        <h2 id="days-h" className="h2">
          Day by day
        </h2>
        <p className="small" style={{ marginTop: 0 }}>
          Bars, in order: {names.join(", ")}. The line on each is your mark.
        </p>
        <ul className="list wk-rows">
          {days.map((d) => {
            const dayName = weekdayLong(d.date);
            const label = d.logged
              ? `${dayName}, ${dateShort(d.date)}. ${d.coverage.map((c) => `${shortName(c.nutrient)}, ${c.hasUnknown ? "at least " : ""}${pct(c.value)} percent of your mark`).join(". ")}. ${foodNames(d.entries, 3)}. Open this day.`
              : `${dayName}, ${dateShort(d.date)}. ${HISTORY_COPY.notLogged} Open this day.`;
            return (
              <li key={d.date}>
                <button type="button" className={`wk-row${d.logged ? "" : " wk-row--plain"}`} aria-label={label} onClick={() => dispatch({ t: "viewDay", date: d.date })}>
                  <span className="wk-date" aria-hidden="true">
                    <span className="wk-weekday">{dayName}</span>
                    <span className="wk-sub">{dateShort(d.date)}</span>
                  </span>
                  {d.logged ? (
                    <>
                      <span className="wk-bars" aria-hidden="true">
                        {d.coverage.map((c) => (
                          <MarkBar key={c.nutrient} coverage={c.value} max={1.25} />
                        ))}
                      </span>
                      <span className="wk-foods" aria-hidden="true">
                        {foodNames(d.entries, 3)}
                      </span>
                    </>
                  ) : (
                    <span className="wk-none" aria-hidden="true">
                      {HISTORY_COPY.notLogged}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
