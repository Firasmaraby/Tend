import { useEffect } from "react";
import { compass } from "../content";
import { roundDay } from "../engine";
import { Browse } from "./Browse";
import { Choose } from "./Choose";
import { DemoMenu } from "./Demo";
import { EndOfRound } from "./EndOfRound";
import { Guide } from "./Guide";
import { Learn } from "./Learn";
import { About, Screener } from "./Onboarding";
import { RoundTab } from "./Round";
import { SheetHost } from "./Sheets";
import { Today } from "./Today";
import { useStore, type Tab } from "./store";

const ICONS: Record<Tab, JSX.Element> = {
  today: (
    <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
      <rect x="6" y="8" width="12" height="13" rx="4" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <rect x="8.5" y="3.5" width="7" height="3.5" rx="1.2" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <path d="M6.5 14h11" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  ),
  browse: (
    <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="11" cy="11" r="6.2" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <path d="M15.8 15.8L20 20" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  ),
  learn: (
    <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 5.5c3-1.2 5.5-1 8 .8 2.5-1.8 5-2 8-.8v13c-3-1.2-5.5-1-8 .8-2.5-1.8-5-2-8-.8z" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M12 6.3v13" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  ),
  round: (
    <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <path d="M12 7v5l3 2" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
};
const LABELS: Record<Tab, string> = { today: "Today", browse: "Browse", learn: "Learn", round: "Round" };

function Header() {
  const { state } = useStore();
  const r = state.round!;
  const day = roundDay(r, state.today);
  const week = Math.ceil(day / 7);
  return (
    <header className={`app-header${week >= 5 ? " app-header--late" : ""}`}>
      <p className="header-day">Day {day} of 42</p>
      <p className="header-stage">
        Week {week} · <em>{compass(day).stage}</em>
      </p>
    </header>
  );
}

function TabBar() {
  const { state, dispatch } = useStore();
  return (
    <nav className="tabbar" aria-label="Main">
      {(Object.keys(LABELS) as Tab[]).map((t) => (
        <button key={t} type="button" className="tab" aria-current={state.tab === t ? "page" : undefined} onClick={() => dispatch({ t: "tab", tab: t })}>
          {ICONS[t]}
          <span>{LABELS[t]}</span>
        </button>
      ))}
    </nav>
  );
}

function Main() {
  const { state } = useStore();
  switch (state.tab) {
    case "today":
      return <Today />;
    case "browse":
      return <Browse />;
    case "learn":
      return <Learn />;
    case "round":
      return <RoundTab />;
  }
}

export function App() {
  const { state, dispatch } = useStore();

  useEffect(() => {
    const el = document.documentElement;
    if (state.theme === "auto") el.removeAttribute("data-theme");
    else el.setAttribute("data-theme", state.theme);
  }, [state.theme]);

  useEffect(() => {
    if (!state.toast) return;
    const t = window.setTimeout(() => dispatch({ t: "toast", text: null }), 2600);
    return () => window.clearTimeout(t);
  }, [state.toast, dispatch]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [state.phase, state.tab, state.learnNutrient]);

  let body;
  switch (state.phase) {
    case "guide":
      body = <Guide />;
      break;
    case "about":
      body = <About />;
      break;
    case "screener":
      body = <Screener />;
      break;
    case "choose":
      body = <Choose />;
      break;
    case "end":
      body = state.round ? <EndOfRound /> : null;
      break;
    case "app":
      body = state.round ? (
        <>
          <Header />
          <main className="app-main">
            <Main />
          </main>
          <TabBar />
        </>
      ) : null;
      break;
  }

  return (
    <div className={`shell shell--${state.phase}`}>
      <DemoMenu />
      {body}
      <SheetHost />
      <div className="toast-wrap" aria-live="polite">
        {state.toast ? <p className="toast">{state.toast}</p> : null}
      </div>
    </div>
  );
}
