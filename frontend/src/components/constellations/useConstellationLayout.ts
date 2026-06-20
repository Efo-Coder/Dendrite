import { useMemo } from 'react';
import { Constellation, ConstellationLink } from '../../types';

// Deterministic, frozen placement for the constellation field. We run a short
// attraction/repulsion relaxation from seeded start positions and then freeze it,
// so the sky is stable across reloads and never jitters at runtime (no live
// force-graph — that's exactly the look we're avoiding).

export type LayoutMap = Map<string, [number, number, number]>;

const MAX_RADIUS = 8.5; // field extent in world units
const Z_DEPTH = 1.6; // subtle parallax spread on z
const ITERATIONS = 140;
const REPULSION = 6;
const SPRING = 0.04;
const LINK_MIN = 2.2; // rest length for the strongest links
const LINK_MAX = 6.5; // rest length for the faintest links
const CENTER_PULL = 0.012;

// Small, fast seeded PRNG so positions are reproducible per theme set.
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashIds(ids: string[]): number {
  let h = 2166136261;
  for (const id of ids) {
    for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 16777619);
  }
  return h >>> 0;
}

export function useConstellationLayout(
  constellations: Constellation[],
  links: ConstellationLink[],
): LayoutMap {
  return useMemo(() => {
    const ids = constellations.map((c) => c.id);
    const rng = mulberry32(hashIds(ids));
    const n = constellations.length;

    const xs = new Float32Array(n);
    const ys = new Float32Array(n);
    const zs = new Float32Array(n);
    const index = new Map<string, number>();

    // Seed: important themes start nearer the centre, spread by the golden angle
    // so the initial ring is even rather than clumped.
    constellations.forEach((c, i) => {
      index.set(c.id, i);
      const radius = (1 - Math.sqrt(c.importance)) * MAX_RADIUS * (0.7 + rng() * 0.3);
      const angle = i * 2.399963 + rng() * 0.6;
      xs[i] = Math.cos(angle) * radius;
      ys[i] = Math.sin(angle) * radius;
      zs[i] = (rng() * 2 - 1) * Z_DEPTH;
    });

    const edges = links
      .map((l) => ({ a: index.get(l.source), b: index.get(l.target), w: l.weight }))
      .filter((e): e is { a: number; b: number; w: number } => e.a !== undefined && e.b !== undefined);

    // Relaxation with cooling: repulsion keeps themes apart, links pull related
    // ones together (shorter rest length the stronger the bond), a faint pull
    // keeps the whole field centred.
    for (let step = 0; step < ITERATIONS; step++) {
      const cooling = 1 - step / ITERATIONS;
      const fx = new Float32Array(n);
      const fy = new Float32Array(n);

      for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
          let dx = xs[i] - xs[j];
          let dy = ys[i] - ys[j];
          let d2 = dx * dx + dy * dy;
          if (d2 < 0.01) {
            dx = rng() - 0.5;
            dy = rng() - 0.5;
            d2 = 0.01;
          }
          const f = REPULSION / d2;
          const d = Math.sqrt(d2);
          fx[i] += (dx / d) * f;
          fy[i] += (dy / d) * f;
          fx[j] -= (dx / d) * f;
          fy[j] -= (dy / d) * f;
        }
      }

      for (const e of edges) {
        const rest = LINK_MAX - (LINK_MAX - LINK_MIN) * e.w;
        const dx = xs[e.b] - xs[e.a];
        const dy = ys[e.b] - ys[e.a];
        const d = Math.sqrt(dx * dx + dy * dy) || 0.01;
        const f = SPRING * (d - rest) * (0.4 + e.w);
        fx[e.a] += (dx / d) * f;
        fy[e.a] += (dy / d) * f;
        fx[e.b] -= (dx / d) * f;
        fy[e.b] -= (dy / d) * f;
      }

      for (let i = 0; i < n; i++) {
        fx[i] -= xs[i] * CENTER_PULL;
        fy[i] -= ys[i] * CENTER_PULL;
        xs[i] += fx[i] * cooling * 0.5;
        ys[i] += fy[i] * cooling * 0.5;
      }
    }

    const map: LayoutMap = new Map();
    constellations.forEach((c, i) => map.set(c.id, [xs[i], ys[i], zs[i]]));
    return map;
  }, [constellations, links]);
}
