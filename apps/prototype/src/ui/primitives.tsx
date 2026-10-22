import { useEffect, useId, useRef, type ReactNode } from "react";
import type { FoodCategory } from "@tend/core";
import { CATEGORY_LABEL, chipKey } from "./format";
import { useStore } from "./store";
import { GLOSSARY } from "../content";

export function Swatch({ category }: { category: FoodCategory }) {
  return (
    <>
      <span className="swatch" style={{ background: `var(--c-${chipKey(category)})` }} aria-hidden="true" />
      <span className="sr">{CATEGORY_LABEL[category]}: </span>
    </>
  );
}

export function PillRow({ children }: { children: ReactNode }) {
  return <span className="pills">{children}</span>;
}

/** A glossary word: dotted underline, opens the same short definition everywhere. */
export function Term({ id, children }: { id: keyof typeof GLOSSARY | string; children?: ReactNode }) {
  const { dispatch } = useStore();
  return (
    <button type="button" className="term" onClick={() => dispatch({ t: "sheet", sheet: { kind: "glossary", term: id } })}>
      {children ?? id}
    </button>
  );
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: { id: T; label: string }[];
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div className="seg" role="group" aria-label={label}>
      {options.map((o) => (
        <button key={o.id} type="button" className="seg-btn" aria-pressed={value === o.id} onClick={() => onChange(o.id)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Chevron({ open }: { open: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true" style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform .2s" }}>
      <path d="M4 7l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function PlusIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
      <path d="M10 4v12M4 10h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function CloseIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" aria-hidden="true">
      <path d="M4 4l10 10M14 4L4 14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function BackIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
      <path d="M12 4l-6 6 6 6" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Bottom sheet with focus handling, Escape and scroll lock. */
export function Sheet({ title, onClose, children, tall }: { title: string; onClose: () => void; children: ReactNode; tall?: boolean }) {
  const panel = useRef<HTMLDivElement>(null);
  const titleId = useId();
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    document.body.classList.add("lock");
    panel.current?.focus();
    return () => {
      document.body.classList.remove("lock");
      prev?.focus?.();
    };
  }, []);
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.stopPropagation();
      onClose();
      return;
    }
    if (e.key !== "Tab" || !panel.current) return;
    const f = panel.current.querySelectorAll<HTMLElement>('button:not([disabled]),input:not([disabled]),select:not([disabled]),[href],[tabindex]:not([tabindex="-1"])');
    if (!f.length) return;
    const first = f[0]!;
    const last = f[f.length - 1]!;
    if (e.shiftKey && (document.activeElement === first || document.activeElement === panel.current)) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };
  return (
    <div className="sheet-wrap" onKeyDown={onKey}>
      <div className="backdrop" onClick={onClose} />
      <div className={`sheet${tall ? " sheet--tall" : ""}`} role="dialog" aria-modal="true" aria-labelledby={titleId} ref={panel} tabIndex={-1}>
        <div className="sheet-head">
          <h2 id={titleId} className="sheet-title">
            {title}
          </h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">
            <CloseIcon />
          </button>
        </div>
        <div className="sheet-body">{children}</div>
      </div>
    </div>
  );
}
