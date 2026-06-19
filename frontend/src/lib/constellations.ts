import { Constellation, InsightFact } from '../types';

// Pure mapping from a theme's normalized importance to the light it casts, plus
// the calm prose for reflective insights. No rendering, no React — kept apart so
// the WebGL layer and any future renderer can share it.

// ─── Light mapping ───────────────────────────────────────────────────────────

// Quiet themes still glow faintly rather than vanish (the map never goes dark).
const BRIGHTNESS_FLOOR = 0.38;

// Importance maps to a gentle size range; the spread is deliberately narrow so
// the universe reads as a calm field, not a bar chart of circles.
export function radiusFor(importance: number, min: number, max: number): number {
  return min + (max - min) * Math.sqrt(Math.max(0, Math.min(1, importance)));
}

export function brightnessFor(importance: number): number {
  return BRIGHTNESS_FLOOR + (1 - BRIGHTNESS_FLOOR) * Math.max(0, Math.min(1, importance));
}

// Deterministic hue for emergent (untagged) themes, so a theme keeps its colour
// across reloads. Tagged themes use their own tag colour.
function hueFromString(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) % 360;
  return h;
}

export function constellationColor(c: Constellation): string {
  if (c.color) return c.color;
  return `hsl(${hueFromString(c.title)} 60% 72%)`;
}

// Qualitative recency, never numeric — the spec forbids exposing raw metrics.
export function activityPhrase(lastActivity: string): string {
  const days = (Date.now() - new Date(lastActivity).getTime()) / 86_400_000;
  if (days < 3) return 'Active in your most recent thinking.';
  if (days < 14) return 'Alive and recently revisited.';
  if (days < 45) return 'Quietly present lately.';
  return 'Resting, but never gone.';
}

// ─── Reflective insights ─────────────────────────────────────────────────────

// Renders a backend insight fact into Dendrite's quiet, literary voice. Reflective
// rather than analytical — no numbers beyond the one that carries meaning.
export function insightSentence(fact: InsightFact): string {
  switch (fact.kind) {
    case 'consistency': {
      if (fact.months >= 12) {
        const years = Math.round(fact.months / 12);
        return `You have returned to ${fact.theme} for over ${years === 1 ? 'a year' : `${years} years`}.`;
      }
      return `You have written about ${fact.theme} consistently for ${fact.months} months.`;
    }
    case 'connection':
      return `${fact.a} and ${fact.b} have become increasingly connected.`;
    case 'recency':
      return `Most recent ideas trace back to ${fact.theme}.`;
  }
}
