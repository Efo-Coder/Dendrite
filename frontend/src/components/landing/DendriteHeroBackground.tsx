import { useMemo } from 'react';

// Deterministischer RNG (Mulberry32) — gleiche Struktur bei jedem Render
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const VIEW_W = 1440;
const VIEW_H = 900;
const MAX_GEN = 6;
const GEN_DELAY = 0.4; // Sekunden pro Generation — die Zeichnung wächst nach außen

interface Segment { d: string; width: number; opacity: number; delay: number }
interface Dot { x: number; y: number; r: number; opacity: number; delay: number }

function grow(
  rng: () => number,
  segments: Segment[],
  dots: Dot[],
  x: number, y: number,
  angle: number, len: number,
  gen: number,
) {
  if (gen >= MAX_GEN || len < 16) {
    // Synapsen-Punkte an einem Teil der Astspitzen
    if (rng() < 0.3) {
      dots.push({
        x, y,
        r: 1.2 + rng() * 1.6,
        opacity: 0.25 + rng() * 0.3,
        delay: MAX_GEN * GEN_DELAY + rng() * 0.8,
      });
    }
    return;
  }
  const a = angle + (rng() - 0.5) * 0.5;
  const x1 = x + Math.cos(a) * len;
  const y1 = y + Math.sin(a) * len;
  // Kontrollpunkt senkrecht zur Wuchsrichtung versetzt — organische Krümmung
  const bow = (rng() - 0.5) * len * 0.55;
  const mx = (x + x1) / 2 + Math.cos(a + Math.PI / 2) * bow;
  const my = (y + y1) / 2 + Math.sin(a + Math.PI / 2) * bow;
  segments.push({
    d: `M${x.toFixed(1)} ${y.toFixed(1)}Q${mx.toFixed(1)} ${my.toFixed(1)} ${x1.toFixed(1)} ${y1.toFixed(1)}`,
    width: Math.max(0.5, 2.4 - gen * 0.35),
    opacity: Math.max(0.14, 0.42 - gen * 0.05),
    delay: gen * GEN_DELAY + rng() * 0.2,
  });
  const spread = 0.3 + rng() * 0.4;
  grow(rng, segments, dots, x1, y1, a - spread, len * (0.66 + rng() * 0.16), gen + 1);
  grow(rng, segments, dots, x1, y1, a + spread, len * (0.66 + rng() * 0.16), gen + 1);
}

function generate() {
  const rng = mulberry32(11);
  const segments: Segment[] = [];
  const dots: Dot[] = [];
  // Wurzeln an den Rändern — die Mitte bleibt frei für die Headline
  const roots: [number, number, number, number][] = [
    [-30, 650, -0.55, 175],
    [-30, 170, 0.35, 150],
    [VIEW_W + 30, 610, Math.PI + 0.5, 175],
    [VIEW_W + 30, 140, Math.PI - 0.38, 150],
  ];
  for (const [x, y, angle, len] of roots) grow(rng, segments, dots, x, y, angle, len, 0);
  return { segments, dots };
}

export default function DendriteHeroBackground({ ready }: { ready: boolean }) {
  const { segments, dots } = useMemo(generate, []);

  return (
    <div
      aria-hidden
      style={{
        position: 'absolute',
        inset: 0,
        background: 'radial-gradient(ellipse 90% 75% at 50% 28%, var(--bg), var(--bg-deep) 100%)',
      }}
    >
      {/* Warmes Licht hinter der Headline */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(ellipse 46% 38% at 50% 38%, color-mix(in oklch, var(--accent) 8%, transparent), transparent 70%)',
        }}
      />
      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        preserveAspectRatio="xMidYMid slice"
        className={ready ? 'dendrite-on' : undefined}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
      >
        <defs>
          {/* stopColor via style — Presentation-Attribute lösen var() nicht auf */}
          <radialGradient id="dendrite-glow">
            <stop offset="0%" style={{ stopColor: 'var(--accent-hi)' }} stopOpacity={0.55} />
            <stop offset="100%" style={{ stopColor: 'var(--accent-hi)' }} stopOpacity={0} />
          </radialGradient>
        </defs>
        {segments.map((s, i) => (
          <path
            key={i}
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
        {dots.map((p, i) => (
          <g key={i} className="dendrite-dot" style={{ animationDelay: `${p.delay}s` }}>
            <circle
              className="dendrite-halo"
              cx={p.x.toFixed(1)}
              cy={p.y.toFixed(1)}
              r={(p.r * 5).toFixed(2)}
              fill="url(#dendrite-glow)"
              fillOpacity={p.opacity}
              // Negatives Delay: startet mitten im Zyklus — die Punkte atmen versetzt
              style={{ animationDelay: `-${(p.delay % 2.4).toFixed(2)}s` }}
            />
            <circle
              cx={p.x.toFixed(1)}
              cy={p.y.toFixed(1)}
              r={p.r.toFixed(2)}
              fill="var(--accent-hi)"
              fillOpacity={Math.min(1, p.opacity + 0.2)}
            />
          </g>
        ))}
      </svg>
    </div>
  );
}
