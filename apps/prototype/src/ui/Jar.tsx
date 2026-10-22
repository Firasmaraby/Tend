import { useId } from "react";

// Geometry in a 100 x 130 box. The interior runs y=25 (top) to y=123 (bottom).
const TOP = 25;
const BOTTOM = 123;
const H = BOTTOM - TOP;
const MARK_AT = 0.78; // the mark line sits at 78% of the interior height
const MARK_Y = BOTTOM - MARK_AT * H;
const MAX_COVERAGE = 1.28;

/** Fill fraction of the interior for a coverage; 1.0 lands exactly on the mark line. */
export function fillFraction(coverage: number): number {
  return MARK_AT * Math.min(Math.max(coverage, 0), MAX_COVERAGE);
}

const BODY = "M10 42a20 20 0 0 1 20-20h40a20 20 0 0 1 20 20v64a20 20 0 0 1-20 20H30a20 20 0 0 1-20-20z";
const INNER = "M13 42a17 17 0 0 1 17-17h40a17 17 0 0 1 17 17v64a17 17 0 0 1-17 17H30a17 17 0 0 1-17-17z";

export function Jar({ coverage, width = 72, markLabel = true, flat = false }: { coverage: number; width?: number; markLabel?: boolean; flat?: boolean }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const f = fillFraction(coverage);
  const dy = (1 - f) * H;
  const past = coverage > 1.0001;
  const height = (width * 130) / 100;
  return (
    <span className={`jar${past ? " jar--past" : ""}${flat ? " jar--flat" : ""}`} style={{ width, height }}>
      <svg viewBox="0 0 100 130" width={width} height={height} aria-hidden="true" focusable="false" className="jar-svg">
        <defs>
          <clipPath id={`in${uid}`}>
            <path d={INNER} />
          </clipPath>
          <clipPath id={`above${uid}`}>
            <rect x="0" y={TOP} width="100" height={MARK_Y - TOP} />
          </clipPath>
        </defs>
        <path d={BODY} className="jar-glass" />
        <g clipPath={`url(#in${uid})`}>
          <g className="jar-fill" style={{ transform: `translateY(${dy}px)` }}>
            <rect x="8" y={TOP} width="84" height={H + 24} className="jar-fill-rect" />
            <rect x="8" y={TOP} width="84" height="2.4" className="jar-fill-edge" />
          </g>
          <g clipPath={`url(#above${uid})`}>
            <g className="jar-fill" style={{ transform: `translateY(${dy}px)` }}>
              <rect x="8" y={TOP} width="84" height={H + 24} className="jar-glow-rect" />
            </g>
          </g>
          <line x1="8" x2="92" y1={MARK_Y} y2={MARK_Y} className="jar-mark-halo" />
          <line x1="8" x2="92" y1={MARK_Y} y2={MARK_Y} className="jar-mark" />
        </g>
        <path d={BODY} className="jar-outline" />
        <path d="M19 52v52" className="jar-shine" />
        <rect x="30" y="13" width="40" height="10" rx="2" className="jar-neck" />
        <rect x="25" y="3" width="50" height="12" rx="4" className="jar-lid" />
      </svg>
      {markLabel && width >= 56 ? (
        <span className="jar-mark-label" style={{ top: `${(MARK_Y / 130) * 100}%` }}>
          mark
        </span>
      ) : null}
    </span>
  );
}
