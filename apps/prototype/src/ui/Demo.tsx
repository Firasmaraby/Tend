import { useEffect, useRef, useState } from "react";
import { useStore, type DemoKind } from "./store";

function effectiveDark(theme: "auto" | "light" | "dark"): boolean {
  if (theme !== "auto") return theme === "dark";
  try {
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  } catch {
    return false;
  }
}

export function DemoMenu() {
  const { state, dispatch } = useStore();
  const [open, setOpen] = useState(false);
  const btn = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        btn.current?.focus();
      }
    };
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!panel.current?.contains(t) && !btn.current?.contains(t)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDown);
    panel.current?.querySelector<HTMLElement>("button")?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDown);
    };
  }, [open]);

  const run = (fn: () => void) => () => {
    fn();
    setOpen(false);
    window.scrollTo(0, 0);
  };
  const demo = (kind: DemoKind) => run(() => dispatch({ t: "demo", kind }));

  return (
    <div className="demo">
      <button ref={btn} type="button" className="demo-pill" aria-haspopup="true" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <span>Prototype</span>
      </button>
      {open ? (
        <div className="demo-menu" ref={panel} role="group" aria-label="Prototype demo menu">
          <p className="demo-note">{state.sample ? "Showing sample data." : "Demo controls for the prototype."}</p>
          <button type="button" className="demo-item" onClick={run(() => dispatch({ t: "reset" }))}>
            Start over (new user)
          </button>
          <button type="button" className="demo-item" onClick={demo("day9")}>
            Jump to day 9<span className="demo-sub">Sample data</span>
          </button>
          <button type="button" className="demo-item" onClick={demo("day14")}>
            Jump to day 14 (check-in)<span className="demo-sub">Sample data</span>
          </button>
          <button type="button" className="demo-item" onClick={demo("day36")}>
            Jump to week 6 (day 36)<span className="demo-sub">Sample data</span>
          </button>
          <button type="button" className="demo-item" onClick={demo("end")}>
            End of round<span className="demo-sub">Sample data</span>
          </button>
          <button type="button" className="demo-item" onClick={run(() => dispatch({ t: "theme", theme: effectiveDark(state.theme) ? "light" : "dark" }))}>
            Toggle dark mode
          </button>
        </div>
      ) : null}
    </div>
  );
}
