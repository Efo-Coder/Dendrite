import Anthropic from '@anthropic-ai/sdk';
import { prisma } from '../lib/prisma';
import type { ConstellationGraphDTO } from './constellation.service';

// Gives emergent keyword themes ("kw:<term>", title = a raw lowercase term) a
// dignified display name via Claude — one batched call for all unnamed themes,
// persisted per user+theme so the arbor keeps its names across rebuilds and
// deploys. Privacy: only the term and its co-occurring keywords are sent,
// never note content or note titles. Any failure falls back silently to the
// raw term; the graph never breaks because naming did.

// ─── Constants ───────────────────────────────────────────────────────────────

const MODEL = 'claude-opus-4-8';
// A handful of two-word names plus adaptive thinking — far below this cap; it
// only bounds the cost of a runaway response.
const MAX_TOKENS = 4000;
const MAX_NAME_CHARS = 60;

const SYSTEM_PROMPT = [
  'You name emergent themes for Dendrite, a quiet, literary note-taking app.',
  'Each input theme is a recurring term from a user\'s private notes, given with co-occurring keywords as context. Note content is never shown to you.',
  'For each theme, return a short display name: one to three words, dignified and concrete, in the same language as the term and its keywords (German terms get German names).',
  'Stay grounded in the term — never invent a topic the keywords do not support. If the term already works as a name, simply capitalize it properly.',
  'No quotation marks, no emoji, no trailing punctuation.',
].join('\n');

// The response schema keeps the mapping explicit: names come back keyed by the
// input term, never by position.
const OUTPUT_SCHEMA = {
  type: 'object' as const,
  properties: {
    names: {
      type: 'array' as const,
      items: {
        type: 'object' as const,
        properties: {
          term: { type: 'string' as const },
          name: { type: 'string' as const },
        },
        required: ['term', 'name'],
        additionalProperties: false,
      },
    },
  },
  required: ['names'],
  additionalProperties: false,
};

// ─── Claude call ─────────────────────────────────────────────────────────────

async function nameThemes(themes: { term: string; keywords: string[] }[]): Promise<Map<string, string>> {
  const anthropic = new Anthropic();
  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    thinking: { type: 'adaptive' },
    system: SYSTEM_PROMPT,
    output_config: { format: { type: 'json_schema', schema: OUTPUT_SCHEMA } },
    messages: [{ role: 'user', content: JSON.stringify({ themes }) }],
  });

  const text = response.content
    .map((block) => (block.type === 'text' ? block.text : ''))
    .join('')
    .trim();
  if (!text) return new Map();

  const parsed = JSON.parse(text) as { names: { term: string; name: string }[] };
  const names = new Map<string, string>();
  for (const entry of parsed.names) {
    const name = entry.name.trim();
    if (name.length > 0 && name.length <= MAX_NAME_CHARS) names.set(entry.term, name);
  }
  return names;
}

// ─── Public API ──────────────────────────────────────────────────────────────

// Replaces the titles of emergent themes in place: stored names win, unnamed
// themes get named in one Claude call and persisted. Tag themes are untouched —
// they already carry the user's own bookmark names. Insights reference themes
// by title, so they are remapped alongside.
export async function applyThemeNames(userId: string, graph: ConstellationGraphDTO): Promise<void> {
  const emergent = graph.constellations.filter((c) => c.source === 'keyword');
  if (emergent.length === 0) return;

  const stored = await prisma.constellationThemeName.findMany({
    where: { userId, themeId: { in: emergent.map((c) => c.id) } },
    select: { themeId: true, title: true },
  });
  const titleByThemeId = new Map(stored.map((s) => [s.themeId, s.title]));

  const missing = emergent.filter((c) => !titleByThemeId.has(c.id));
  if (missing.length > 0 && process.env.ANTHROPIC_API_KEY) {
    try {
      const named = await nameThemes(
        missing.map((c) => ({ term: c.id.slice('kw:'.length), keywords: c.keywords })),
      );
      for (const c of missing) {
        const name = named.get(c.id.slice('kw:'.length));
        if (!name) continue;
        await prisma.constellationThemeName.upsert({
          where: { userId_themeId: { userId, themeId: c.id } },
          update: { title: name },
          create: { userId, themeId: c.id, title: name },
        });
        titleByThemeId.set(c.id, name);
      }
    } catch (err) {
      // Naming is a garnish: log and serve the raw terms rather than failing.
      console.error('Constellation naming error:', err);
    }
  }

  const nameByOldTitle = new Map<string, string>();
  for (const c of emergent) {
    const title = titleByThemeId.get(c.id);
    if (!title) continue;
    nameByOldTitle.set(c.title, title);
    c.title = title;
  }

  // Insights were built from the raw terms before naming ran.
  for (const fact of graph.insights) {
    if (fact.kind === 'connection') {
      fact.a = nameByOldTitle.get(fact.a) ?? fact.a;
      fact.b = nameByOldTitle.get(fact.b) ?? fact.b;
    } else {
      fact.theme = nameByOldTitle.get(fact.theme) ?? fact.theme;
    }
  }
}
