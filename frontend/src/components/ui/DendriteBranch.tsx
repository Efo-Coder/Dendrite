import { useId, type CSSProperties } from "react";

// Handgesetzter Dendriten-Zweig — wächst von der Mitte nach außen.
// Animationen kommen aus den globalen Klassen dendrite-seg/-dot/-halo (index.css),
// scharf geschaltet über `active` → dendrite-on.
const SEGMENTS = [
  { d: "M320 40C250 38 180 44 100 40", width: 1.2, opacity: 0.5, delay: 0 },
  { d: "M320 40C390 42 460 36 540 40", width: 1.2, opacity: 0.5, delay: 0 },
  { d: "M150 40Q130 30 112 22", width: 0.8, opacity: 0.38, delay: 0.55 },
  { d: "M205 41Q190 50 178 55", width: 0.8, opacity: 0.38, delay: 0.7 },
  { d: "M480 39Q500 48 516 56", width: 0.8, opacity: 0.38, delay: 0.55 },
  { d: "M435 40Q450 30 462 25", width: 0.8, opacity: 0.38, delay: 0.7 },
];

const DOTS = [
  { x: 320, y: 40, r: 2.2, opacity: 0.6, delay: 0.15 },
  { x: 100, y: 40, r: 1.7, opacity: 0.45, delay: 0.9 },
  { x: 540, y: 40, r: 1.7, opacity: 0.45, delay: 0.9 },
  { x: 112, y: 22, r: 1.3, opacity: 0.4, delay: 1.1 },
  { x: 516, y: 56, r: 1.3, opacity: 0.4, delay: 1.1 },
];

export function DendriteBranch({
  active = true,
  style,
}: {
  active?: boolean;
  style?: CSSProperties;
}) {
  // Eindeutige Gradient-ID — die Komponente kann mehrfach im Dokument leben
  const gradientId = useId();

  return (
    <svg
      aria-hidden
      viewBox="0 0 640 80"
      className={active ? "dendrite-on" : undefined}
      style={{ display: "block", height: "auto", ...style }}
    >
      <defs>
        <radialGradient id={gradientId}>
          <stop offset="0%" style={{ stopColor: "var(--accent-hi)" }} stopOpacity={0.55} />
          <stop offset="100%" style={{ stopColor: "var(--accent-hi)" }} stopOpacity={0} />
        </radialGradient>
      </defs>
      {SEGMENTS.map((s) => (
        <path
          key={s.d}
          className="dendrite-seg"
          d={s.d}
          pathLength={1}
          fill="none"
          stroke="var(--accent)"
          strokeOpacity={s.opacity}
          strokeWidth={s.width}
          strokeLinecap="round"
          style={{ animationDelay: `${s.delay}s` }}
        />
      ))}
      {DOTS.map((p) => (
        <g key={`${p.x}-${p.y}`} className="dendrite-dot" style={{ animationDelay: `${p.delay}s` }}>
          <circle
            className="dendrite-halo"
            cx={p.x}
            cy={p.y}
            r={p.r * 5}
            fill={`url(#${gradientId})`}
            fillOpacity={p.opacity}
            style={{ animationDelay: `-${(p.delay % 2.4).toFixed(2)}s` }}
          />
          <circle cx={p.x} cy={p.y} r={p.r} fill="var(--accent-hi)" fillOpacity={Math.min(1, p.opacity + 0.2)} />
        </g>
      ))}
    </svg>
  );
}
