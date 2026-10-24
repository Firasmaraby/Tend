import { useEffect, useId, useMemo, useRef, useState } from "react";
import { addDays, amountIn, MEALS, type LogEntry, type Meal, type NutrientCode, type PairingRuleId, type Ranked } from "@tend/core";
import { compass, HISTORY_COPY, MEAL_LABEL, type HintId } from "../content";
import { bestRightNow, canEditDay, entriesOn, jars, loggedDayCount, lookup, pairingForFood, roundDay, rotation, type JarState } from "../engine";
import { useCtx } from "./ctx";
import { HintCard } from "./Hint";
import { Jar } from "./Jar";
import { Foundation } from "./Foundation";
import { dateLong, dayNumber, dayWord, servingWithGrams, inlineName, kcalText, mealNow, pct, pillName, pillsFor, servingPhrase, shortName, weekdayInitial, whyLine } from "./format";
import { MealPick, RepeatNow } from "./Meals";
import { PairChip, PairingCard, usePairingCards } from "./Pairing";
import { PeriodCard, PeriodStart } from "./Period";
import { Chevron, CloseIcon, PlusIcon, Segmented, Swatch } from "./primitives";

export const PREGNANCY_LINE = "Check with your doctor or midwife. Tend isn't medical advice.";

interface Chip {
  key: number;
  nutrient: NutrientCode;
  text: string;
}

function pctText(j: JarState): string {
  if (j.today === 0 && j.todayHasUnknown) return "Not listed yet";
  if (j.todayHasUnknown) return `at least ${pct(j.today)}%`;
  return `${pct(j.today)}% of mark`;
}

function roleLabel(role: JarState["role"]): string | null {
  if (role === "carried") return "Carried from last round";
  if (role === "locked") return "Locked in";
  if (role === "project") return "A longer project";
  return null;
}

function JarCol({ j, chips }: { j: JarState; chips: Chip[] }) {
  const { dispatch, periodActive } = useCtx();
  const role = roleLabel(j.role);
  const label = `${shortName(j.nutrient)}, ${j.today === 0 && j.todayHasUnknown ? "not listed yet in your foods" : `${j.todayHasUnknown ? "at least " : ""}${pct(j.today)} percent of your mark`}${role ? `, ${role}` : ""}. Tap for details.`;
  return (
    <button type="button" className="jar-col" aria-label={label} onClick={() => dispatch({ t: "sheet", sheet: { kind: "explainer", nutrient: j.nutrient } })}>
      <span className="jar-stage">
        <Jar coverage={j.today} width={78} />
        {chips.map((c) => (
          <span key={c.key} className="gain-chip" aria-hidden="true">
            {c.text}
          </span>
        ))}
      </span>
      <span className="jar-name" aria-hidden="true">
        {shortName(j.nutrient)}
        {periodActive && j.nutrient === "iron" ? <span className="period-dot" /> : null}
      </span>
      <span className="jar-pct" aria-hidden="true">
        {pctText(j)}
      </span>
      {role ? (
        <span className="jar-role" aria-hidden="true">
          {role}
        </span>
      ) : null}
    </button>
  );
}

function MiniStrip({ js, chips }: { js: JarState[]; chips: Chip[] }) {
  const { dispatch } = useCtx();
  return (
    <div className="mini-strip">
      {js.map((j) => (
        <button
          key={j.nutrient}
          type="button"
          className="mini"
          aria-label={`${shortName(j.nutrient)}, ${pctText(j)}. Tap for details.`}
          onClick={() => dispatch({ t: "sheet", sheet: { kind: "explainer", nutrient: j.nutrient } })}
        >
          <span className="mini-jar">
            <Jar coverage={j.today} width={24} markLabel={false} />
            {chips
              .filter((c) => c.nutrient === j.nutrient)
              .map((c) => (
                <span key={c.key} className="gain-chip gain-chip--mini" aria-hidden="true">
                  {c.text.split(" ")[0]}
                </span>
              ))}
          </span>
          <span className="mini-text" aria-hidden="true">
            <span className="mini-name">{shortName(j.nutrient)}</span>
            <span className="mini-pct">{pctText(j)}</span>
          </span>
        </button>
      ))}
    </div>
  );
}

function LogRow({ id, foodId, grams, meal, at, editable = true }: { id: string; foodId: string; grams: number; meal: Meal | undefined; at: number | undefined; editable?: boolean }) {
  const { dispatch, state } = useCtx();
  const food = lookup(foodId);
  const [fresh, setFresh] = useState(() => at !== undefined && Date.now() - at < 5000);
  const [moving, setMoving] = useState(false);
  const moveId = useId();
  useEffect(() => {
    if (!fresh || at === undefined) return;
    const t = window.setTimeout(() => setFresh(false), Math.max(0, 5000 - (Date.now() - at)));
    return () => window.clearTimeout(t);
  }, [fresh, at]);
  if (!food) return null;
  return (
    <li className="log-row">
      <span className="log-main">
        <span className="food-line">
          <Swatch category={food.category} />
          <span className="food-name">{food.name}</span>
        </span>
        <span className="food-serving">
          {servingPhrase(food, grams)}
          {state.showEnergy ? (kcalText(food, grams) ? ` · ${kcalText(food, grams)}` : "") : ""}
        </span>
        {editable ? (
        <button type="button" className="meal-chip" aria-expanded={moving} aria-controls={moveId} aria-label={`${meal ? MEAL_LABEL[meal] : "No meal"}. Change the meal for ${food.name}`} onClick={() => setMoving((o) => !o)}>
          <span className="meal-chip-pill">
            {meal ? MEAL_LABEL[meal] : "Set meal"}
            <Chevron open={moving} />
          </span>
        </button>
        ) : null}
      </span>
      {!editable ? null : fresh ? (
        <button type="button" className="undo-btn" onClick={() => dispatch({ t: "unlog", id })} aria-label={`Undo adding ${food.name}`}>
          <CloseIcon size={14} />
          <span>Undo</span>
        </button>
      ) : (
        <button type="button" className="remove-btn" onClick={() => dispatch({ t: "unlog", id })} aria-label={`Remove ${food.name}`}>
          Remove
        </button>
      )}
      {moving ? (
        <div id={moveId} className="meal-move">
          <MealPick
            label={`Meal for ${food.name}`}
            value={meal ?? null}
            onChange={(m) => {
              dispatch({ t: "setMeal", id, meal: m });
              setMoving(false);
            }}
          />
        </div>
      ) : null}
    </li>
  );
}

/** Her day, grouped: only meals that have food, in meal order. Newest first inside a meal. */
function MealGroups({
  entries,
  addedAt,
  editable = true,
  noneTitle = "Today",
  onAgain,
}: {
  entries: LogEntry[];
  addedAt: Record<string, number>;
  editable?: boolean;
  noneTitle?: string;
  /** Past days only: copy a meal's entries onto today. */
  onAgain?: (meal: Meal | undefined, items: LogEntry[], title: string) => void;
}) {
  const groups: { key: string; meal: Meal | undefined; title: string; items: LogEntry[] }[] = MEALS.map((m) => ({ key: m, meal: m, title: MEAL_LABEL[m], items: entries.filter((e) => e.meal === m) }));
  groups.push({ key: "none", meal: undefined, title: noneTitle, items: entries.filter((e) => !e.meal) });
  return (
    <>
      {groups
        .filter((g) => g.items.length > 0)
        .map((g) => (
          <div key={g.key} className="meal-group">
            <h3 className="meal-head">{g.title}</h3>
            <ul className="list">
              {[...g.items].reverse().map((e) => (
                <LogRow key={e.id} id={e.id} foodId={e.foodId} grams={e.grams} meal={e.meal} at={addedAt[e.id]} editable={editable} />
              ))}
            </ul>
            {onAgain ? (
              <button type="button" className="text-btn again-btn" onClick={() => onAgain(g.meal, g.items, g.title)}>
                {HISTORY_COPY.haveAgain}
              </button>
            ) : null}
          </div>
        ))}
    </>
  );
}

/** The last seven days, oldest left, today right. A dot means something was logged; nothing else is marked. */
function WeekStrip() {
  const { state, dispatch, today, viewDate } = useCtx();
  const loggedDates = useMemo(() => new Set(state.logs.map((e) => e.logDate)), [state.logs]);
  const days = Array.from({ length: 7 }, (_, i) => addDays(today, i - 6));
  return (
    <div className="week-strip" role="group" aria-label="The last seven days">
      {days.map((d) => {
        const on = d === viewDate;
        const logged = loggedDates.has(d);
        return (
          <button
            key={d}
            type="button"
            className="wk"
            aria-pressed={on}
            aria-label={`${d === today ? "Today, " : ""}${dateLong(d)}${logged ? ", logged" : ""}`}
            onClick={() => dispatch({ t: "viewDay", date: d })}
          >
            <span className="wk-in" aria-hidden="true">
              <span className="wk-day">{weekdayInitial(d)}</span>
              <span className="wk-num">{dayNumber(d)}</span>
              <span className={`wk-dot${logged ? " is-on" : ""}`} />
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function FoodRow({
  r,
  order,
  preferred,
  pair,
  onOpen,
  onAdd,
}: {
  r: Ranked;
  order: readonly NutrientCode[];
  preferred: readonly NutrientCode[];
  pair?: PairingRuleId | null;
  onOpen: () => void;
  onAdd?: () => void;
}) {
  const { state } = useCtx();
  const f = lookup(r.food.id)!;
  const pills = pillsFor(r, order);
  const why = whyLine(r, preferred);
  // Protein is a quiet foundation: mention it only when one serving really brings some.
  const protein = f.serving ? amountIn(f, "protein", f.serving.grams) : undefined;
  const bigProtein = protein !== undefined && protein >= 10 ? Math.round(protein) : null;
  const kcal = state.showEnergy ? kcalText(f, f.serving?.grams ?? 100) : null;
  return (
    <li className="food-row">
      <button type="button" className="food-open" onClick={onOpen}>
        <span className="food-line">
          <Swatch category={f.category} />
          <span className="food-name">{f.name}</span>
        </span>
        <span className="food-serving">
          {servingWithGrams(f)}
          {kcal ? ` · ${kcal}` : ""}
        </span>
        {pills.length || bigProtein !== null ? (
          <span className="pills">
            {pills.map((p) => (
              <span key={p.nutrient} className="pill">
                {pillName(p.nutrient)} {pct(p.share)}%
              </span>
            ))}
            {bigProtein !== null ? <span className="pill pill--plain">Protein {bigProtein} g</span> : null}
          </span>
        ) : null}
        {why ? <span className="why">{why}</span> : null}
        {r.maxServingsPerDay ? <span className="cap">One serving a day is plenty</span> : null}
      </button>
      {onAdd ? (
        <button type="button" className="add-btn" onClick={onAdd} aria-label={`Add one serving of ${f.name}`}>
          <PlusIcon />
        </button>
      ) : null}
      {pair ? <PairChip rule={pair} food={f} /> : null}
    </li>
  );
}

export function Today() {
  const { state, dispatch, profile, today, viewDate, isToday, round, order, active, periodActive } = useCtx();
  const r = round!;
  const { logs, mode, seen } = state;
  const editable = canEditDay(viewDate, today, r.startedOn);
  const js = useMemo(() => jars(profile, r, logs, viewDate), [profile, r, logs, viewDate]);
  const best = useMemo(() => bestRightNow(profile, r, logs, today, mode, 12, periodActive), [profile, r, logs, today, mode, periodActive]);
  const dayEntries = useMemo(() => entriesOn(logs, viewDate), [logs, viewDate]);
  const logged = loggedDayCount(r, logs);
  const rot = useMemo(() => rotation(r, logs), [r, logs]);
  const day = roundDay(r, today);
  const stage = compass(day);
  const pairCards = usePairingCards();
  const pairByFood = useMemo(() => {
    const m = new Map<string, PairingRuleId>();
    for (const rk of best.slice(0, 10)) {
      const rule = pairingForFood(profile, r, rk.food, today, periodActive);
      if (rule) m.set(rk.food.id, rule);
    }
    return m;
  }, [best, profile, r, today, periodActive]);
  // On period days iron shows its share on suggestions even when it isn't one of her three.
  const pillOrder = useMemo(() => {
    const base = order.filter((n) => active.includes(n));
    return periodActive && !base.includes("iron") ? [...base, "iron" as NutrientCode] : base;
  }, [order, active, periodActive]);
  const main = js.filter((j) => j.role !== "locked");
  const locked = js.filter((j) => j.role === "locked");

  // The orchestrated moment: a chip floats up from each jar that just rose.
  const prev = useRef<Partial<Record<NutrientCode, number>> | null>(null);
  const prevDate = useRef(viewDate);
  const keyRef = useRef(0);
  const [chips, setChips] = useState<Chip[]>([]);
  const [announce, setAnnounce] = useState("");
  useEffect(() => {
    const before = prev.current;
    prev.current = Object.fromEntries(js.map((j) => [j.nutrient, j.today]));
    // Switching to another day is not a gain: no chips, no announcement.
    if (prevDate.current !== viewDate) {
      prevDate.current = viewDate;
      setChips([]);
      setAnnounce("");
      return;
    }
    if (!before) return;
    const made: Chip[] = [];
    for (const j of js) {
      const b = before[j.nutrient];
      if (b !== undefined && j.today - b >= 0.01) made.push({ key: ++keyRef.current, nutrient: j.nutrient, text: `+${pct(j.today - b)}% ${inlineName(j.nutrient)}` });
    }
    if (!made.length) return;
    setChips((c) => [...c, ...made]);
    setAnnounce(made.map((m) => m.text).join(", "));
    const t = window.setTimeout(() => setChips((c) => c.filter((x) => !made.includes(x))), 1900);
    return () => window.clearTimeout(t);
  }, [js, viewDate]);

  // Keep the three marks in view once the jars scroll away.
  const rowRef = useRef<HTMLDivElement>(null);
  const [jarsInView, setJarsInView] = useState(true);
  useEffect(() => {
    const el = rowRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => setJarsInView(e ? e.isIntersecting : true), { rootMargin: "-72px 0px 0px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // First-time moments: at most one visible, each shown once, never about absence.
  const candidates: { id: HintId; when: boolean; where: "top" | "best" | "pair" }[] = [
    { id: "first_period", when: periodActive, where: "top" },
    { id: "density", when: mode === "density", where: "best" },
    { id: "why_jar", when: true, where: "top" },
    { id: "first_log", when: logs.length > 0, where: "top" },
    { id: "past_mark", when: js.some((j) => j.today > 1.0001), where: "top" },
    { id: "at_least", when: js.some((j) => j.todayHasUnknown), where: "top" },
    { id: "becoming_yours", when: rot.length > 0, where: "top" },
    { id: "first_pairing", when: pairCards.length > 0 || pairByFood.size > 0, where: pairCards.length > 0 ? "pair" : "best" },
    { id: "capped", when: best.some((x) => x.maxServingsPerDay), where: "best" },
  ];
  const hint = state.showTips && isToday ? candidates.find((c) => c.when && !seen.includes(c.id)) : undefined;

  const add = (rk: Ranked) => {
    dispatch({ t: "log", foodId: rk.food.id, servings: 1, date: today, at: Date.now(), meal: mealNow() });
  };

  // Have it again: copies a meal from the day she is looking at onto today.
  const again = (meal: Meal | undefined, items: LogEntry[], title: string) => {
    dispatch({ t: "repeat", from: items, date: today, ...(meal ? { meal } : {}), at: Date.now() });
    dispatch({ t: "toast", text: meal ? `Added ${title.toLowerCase()} to today.` : "Added to today." });
  };

  return (
    <div className="screen today">
      <div className="mini-sticky">{!jarsInView ? <MiniStrip js={main} chips={chips} /> : null}</div>
      <p className="compass-line">{stage.line}</p>
      <p className="count" aria-live="polite">
        {logged === 1 ? "1 day logged" : `${logged} days logged`}
      </p>
      <WeekStrip />
      {!isToday ? (
        <div className="day-head">
          <h2 className="day-title">{dateLong(viewDate)}</h2>
          <button type="button" className="text-btn" onClick={() => dispatch({ t: "viewDay", date: null })}>
            {HISTORY_COPY.backToToday}
          </button>
        </div>
      ) : null}
      {!isToday ? <p className="small day-note">{editable ? HISTORY_COPY.editableNote : HISTORY_COPY.pastDayNote}</p> : null}
      {profile.status === "pregnant" ? <p className="care-line">{PREGNANCY_LINE}</p> : null}

      <div className="shelf" ref={rowRef}>
        <div className="jar-row">
          {main.map((j) => (
            <JarCol key={j.nutrient} j={j} chips={chips.filter((c) => c.nutrient === j.nutrient)} />
          ))}
        </div>
        {locked.length ? (
          <div className="locked-strip">
            <span className="eyebrow">Locked in</span>
            <div className="locked-items">
              {locked.map((j) => (
                <button key={j.nutrient} type="button" className="mini" aria-label={`${shortName(j.nutrient)}, locked in, ${pctText(j)}. Tap for details.`} onClick={() => dispatch({ t: "sheet", sheet: { kind: "explainer", nutrient: j.nutrient } })}>
                  <span className="mini-jar">
                    <Jar coverage={j.today} width={24} markLabel={false} />
                  </span>
                  <span className="mini-text" aria-hidden="true">
                    <span className="mini-name">{shortName(j.nutrient)}</span>
                    <span className="mini-pct">{pctText(j)}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>
      {periodActive && isToday ? <PeriodCard /> : null}
      <Foundation />
      {isToday ? <PeriodStart /> : null}
      <div className="sr" aria-live="polite">
        {announce}
      </div>

      {hint && hint.where === "top" ? <HintCard id={hint.id} lead={hint.id === "becoming_yours" ? rot[0]?.food.name : undefined} /> : null}

      <section aria-labelledby="had-h" className="section">
        <h2 id="had-h" className="h2">
          {isToday ? "What you've had today" : "What you had"}
        </h2>
        {isToday ? <RepeatNow /> : null}
        {dayEntries.length === 0 ? (
          <p className="small">{isToday ? "Foods you add will appear here." : HISTORY_COPY.notLogged}</p>
        ) : (
          <MealGroups entries={dayEntries} addedAt={state.addedAt} editable={isToday || editable} noneTitle={dayWord(viewDate, today)} {...(isToday ? {} : { onAgain: again })} />
        )}
      </section>

      {isToday && pairCards.length ? (
        <section aria-label="Better together" className="pairs">
          {hint && hint.where === "pair" ? <HintCard id={hint.id} /> : null}
          {pairCards.map((m) => (
            <PairingCard key={m.rule} m={m} />
          ))}
        </section>
      ) : null}

      {isToday ? (
      <section aria-labelledby="best-h" className="section">
        <h2 id="best-h" className="h2">
          Best right now
        </h2>
        <Segmented
          label="Rank foods by"
          value={mode}
          onChange={(m) => dispatch({ t: "mode", mode: m })}
          options={[
            { id: "serving", label: "Per serving" },
            { id: "density", label: "Most nutrient-dense" },
          ]}
        />
        {hint && hint.where === "best" ? <HintCard id={hint.id} /> : null}
        <p className="small" style={{ marginTop: 10 }}>
          {mode === "serving" ? "Real foods, one serving each, that move your marks the most." : "Foods that give you a lot of what you're working on for what they contain."}
        </p>
        {best.length === 0 ? (
          <p className="small">Nothing to suggest right now. Check back after your next food.</p>
        ) : (
          <ul className="list">
            {best.slice(0, 10).map((rk) => (
              <FoodRow key={rk.food.id} r={rk} order={pillOrder} preferred={pillOrder} pair={pairByFood.get(rk.food.id) ?? null} onOpen={() => dispatch({ t: "sheet", sheet: { kind: "food", foodId: rk.food.id } })} onAdd={() => add(rk)} />
            ))}
          </ul>
        )}
      </section>
      ) : null}

      {editable ? (
        <button type="button" className="fab" onClick={() => dispatch({ t: "sheet", sheet: { kind: "add", ...(isToday ? {} : { date: viewDate }) } })}>
          <PlusIcon />
          <span>Add food</span>
        </button>
      ) : null}
    </div>
  );
}

