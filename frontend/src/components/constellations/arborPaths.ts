import * as THREE from 'three';
import { Constellation } from '../../types';
import { radiusFor } from '../../lib/constellations';
import { mulberry32, hashString } from '../../lib/seededRandom';
import type { LayoutMap } from './useConstellationLayout';

// Grows the arbor: one organic limb from the soma (the origin) out to every
// theme position, plus a few short twigs per limb. Pure math — rendering lives
// in ArborBranches. Every shape is seeded per theme id, so a user's arbor keeps
// its exact form across reloads.

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ArborStroke {
  points: THREE.Vector3[]; // evenly spaced, soma → tip
  width0: number; // world units at the base
  width1: number; // world units at the tip
  delay: number; // seconds until this stroke starts drawing
  duration: number; // seconds the stroke takes to draw
}

export interface ArborLimb extends ArborStroke {
  id: string; // theme id (twigs carry none)
  importance: number;
  twigs: ArborStroke[];
}

export interface Arbor {
  limbs: ArborLimb[];
  appearAt: Map<string, number>; // theme id → seconds when its tip node blooms
  totalSec: number; // when the whole arbor has finished growing
}

// ─── Constants ───────────────────────────────────────────────────────────────

// Constant draw speed (seconds per world unit): long limbs simply take longer,
// the same choreography as the loader branch.
const SPEED = 0.24;
const BASE_DELAY = 0.15;
const STAGGER = 0.055; // per limb, ordered by angle so growth sweeps the field
const LIMB_SEGMENTS = 28;
const TWIG_SEGMENTS = 10;
const LIMB_W0_MIN = 0.055;
const LIMB_W0_MAX = 0.105;
const LIMB_W1 = 0.02;
const TWIG_W0 = 0.03;
const TWIG_W1 = 0.012;
const MIN_LIMB_LEN = 1.4; // guard: the most important theme still clears the soma

// ─── Helpers ─────────────────────────────────────────────────────────────────

function polylineLength(points: THREE.Vector3[]): number {
  let len = 0;
  for (let i = 1; i < points.length; i++) len += points[i].distanceTo(points[i - 1]);
  return len;
}

// A calm S-curve from the soma to the tip: two control points bow to opposite
// sides, never far enough to read as a squiggle.
function limbPoints(tip: THREE.Vector3, rng: () => number): THREE.Vector3[] {
  let len = Math.hypot(tip.x, tip.y);
  let dx = tip.x, dy = tip.y;
  if (len < MIN_LIMB_LEN) {
    const angle = rng() * Math.PI * 2;
    dx = Math.cos(angle) * MIN_LIMB_LEN;
    dy = Math.sin(angle) * MIN_LIMB_LEN;
    len = MIN_LIMB_LEN;
  }
  const perp = new THREE.Vector3(-dy / len, dx / len, 0);
  const side = rng() < 0.5 ? 1 : -1;
  const k1 = side * (0.05 + 0.07 * rng());
  const k2 = -side * (0.04 + 0.06 * rng());
  const end = new THREE.Vector3(dx, dy, tip.z);
  const c1 = new THREE.Vector3(dx / 3, dy / 3, tip.z / 3).addScaledVector(perp, len * k1);
  const c2 = new THREE.Vector3((dx * 2) / 3, (dy * 2) / 3, (tip.z * 2) / 3).addScaledVector(perp, len * k2);
  const curve = new THREE.CubicBezierCurve3(new THREE.Vector3(0, 0, 0), c1, c2, end);
  return curve.getSpacedPoints(LIMB_SEGMENTS);
}

// A short shoot leaving the limb partway up, bowed slightly like young growth.
function twigPoints(limb: THREE.Vector3[], attachT: number, rng: () => number): THREE.Vector3[] {
  const idx = Math.min(limb.length - 2, Math.max(1, Math.round(attachT * (limb.length - 1))));
  const base = limb[idx];
  const tangent = limb[idx + 1].clone().sub(limb[idx - 1]);
  tangent.z = 0;
  tangent.normalize();
  const side = rng() < 0.5 ? 1 : -1;
  const angle = side * (0.55 + 0.5 * rng());
  const cos = Math.cos(angle), sin = Math.sin(angle);
  const dir = new THREE.Vector3(tangent.x * cos - tangent.y * sin, tangent.x * sin + tangent.y * cos, 0);
  const limbLen = polylineLength(limb);
  const twigLen = Math.min(1.3, limbLen * (0.1 + 0.08 * rng()));
  const perp = new THREE.Vector3(-dir.y, dir.x, 0);
  const end = base.clone().addScaledVector(dir, twigLen);
  const ctrl = base
    .clone()
    .addScaledVector(dir, twigLen * 0.5)
    .addScaledVector(perp, twigLen * 0.16 * (rng() < 0.5 ? 1 : -1));
  const curve = new THREE.QuadraticBezierCurve3(base.clone(), ctrl, end);
  return curve.getSpacedPoints(TWIG_SEGMENTS);
}

// ─── Arbor assembly ──────────────────────────────────────────────────────────

export function buildArbor(constellations: Constellation[], layout: LayoutMap): Arbor {
  // Growth sweeps around the soma, so delay follows the angular order.
  const order = [...constellations].sort((a, b) => {
    const pa = layout.get(a.id) ?? [0, 0, 0];
    const pb = layout.get(b.id) ?? [0, 0, 0];
    return Math.atan2(pa[1], pa[0]) - Math.atan2(pb[1], pb[0]);
  });

  const limbs: ArborLimb[] = [];
  const appearAt = new Map<string, number>();
  let totalSec = 0;

  order.forEach((c, i) => {
    const pos = layout.get(c.id);
    if (!pos) return;
    const rng = mulberry32(hashString(c.id));
    const points = limbPoints(new THREE.Vector3(pos[0], pos[1], pos[2]), rng);
    const length = polylineLength(points);
    const delay = BASE_DELAY + i * STAGGER;
    const duration = length * SPEED;

    const twigCount = 1 + (rng() < 0.6 ? 1 : 0) + (c.importance > 0.55 ? 1 : 0);
    const twigs: ArborStroke[] = [];
    for (let t = 0; t < twigCount; t++) {
      const attachT = 0.42 + 0.4 * rng();
      const tp = twigPoints(points, attachT, rng);
      twigs.push({
        points: tp,
        width0: TWIG_W0,
        width1: TWIG_W1,
        delay: delay + duration * attachT,
        duration: polylineLength(tp) * SPEED * 1.15,
      });
    }

    const bloom = delay + duration + 0.08;
    appearAt.set(c.id, bloom);
    totalSec = Math.max(totalSec, bloom, ...twigs.map((t) => t.delay + t.duration));
    limbs.push({
      id: c.id,
      importance: c.importance,
      points,
      width0: radiusFor(c.importance, LIMB_W0_MIN, LIMB_W0_MAX),
      width1: LIMB_W1,
      delay,
      duration,
      twigs,
    });
  });

  return { limbs, appearAt, totalSec };
}

// ─── Ribbon geometry ─────────────────────────────────────────────────────────

// A flat tapered ribbon along the stroke, lying in the field plane (the camera
// looks at it nearly head-on, so no billboarding is needed). aT carries the
// arc fraction for the growth shader, aU the across-position for soft edges.
export function buildRibbonGeometry(points: THREE.Vector3[], width0: number, width1: number): THREE.BufferGeometry {
  const n = points.length;
  const position = new Float32Array(n * 2 * 3);
  const aT = new Float32Array(n * 2);
  const aU = new Float32Array(n * 2);
  const indices: number[] = [];

  for (let i = 0; i < n; i++) {
    const prev = points[Math.max(0, i - 1)];
    const next = points[Math.min(n - 1, i + 1)];
    const tx = next.x - prev.x;
    const ty = next.y - prev.y;
    const tl = Math.hypot(tx, ty) || 1;
    const nx = -ty / tl;
    const ny = tx / tl;
    const t = i / (n - 1);
    // Slightly full at the base (pow < 1) — a grown limb, not a straight cone.
    const half = (width0 + (width1 - width0) * Math.pow(t, 0.8)) / 2;
    const p = points[i];
    position.set([p.x + nx * half, p.y + ny * half, p.z, p.x - nx * half, p.y - ny * half, p.z], i * 6);
    aT[i * 2] = t;
    aT[i * 2 + 1] = t;
    aU[i * 2] = 1;
    aU[i * 2 + 1] = -1;
    if (i < n - 1) {
      const a = i * 2;
      indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setIndex(indices);
  geometry.setAttribute('position', new THREE.BufferAttribute(position, 3));
  geometry.setAttribute('aT', new THREE.BufferAttribute(aT, 1));
  geometry.setAttribute('aU', new THREE.BufferAttribute(aU, 1));
  geometry.computeBoundingSphere();
  return geometry;
}
