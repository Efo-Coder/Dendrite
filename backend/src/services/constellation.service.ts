import { prisma } from '../lib/prisma';
import { tokenize, uniqueTerms } from './constellationText';

// Builds the "Idea Constellations" graph for a user: themes that emerge from
// their notes (tags + content keywords), weighted by how developed each theme is
// and linked by how often themes co-occur. All derived on the server, no raw
// scores leave this file — only normalized 0..1 values the UI maps to light.

// ─── Types ───────────────────────────────────────────────────────────────────

export type ConstellationSource = 'tag' | 'keyword';

export interface ConstellationDTO {
  id: string;
  title: string;
  source: ConstellationSource;
  color: string | null; // tag colour hex; null for emergent keyword themes
  importance: number; // 0..1, normalized across the user's themes
  noteCount: number;
  keywords: string[]; // descriptive terms, for the detail view
  firstActivity: string;
  lastActivity: string;
}

export interface ConstellationLinkDTO {
  source: string;
  target: string;
  weight: number; // 0..1
}

// Selection of which reflective lines apply; the UI renders them into prose so
// the literary voice stays in one place.
export type InsightFact =
  | { kind: 'consistency'; theme: string; months: number }
  | { kind: 'connection'; a: string; b: string }
  | { kind: 'recency'; theme: string };

export interface ConstellationGraphDTO {
  constellations: ConstellationDTO[];
  links: ConstellationLinkDTO[];
  insights: InsightFact[];
  generatedAt: string;
}

// ─── Tunables ────────────────────────────────────────────────────────────────

const MAX_KEYWORD_THEMES = 6; // keep the universe calm, not a word cloud
const MIN_KEYWORD_NOTES = 3; // an emergent theme must recur to count
const MAX_THEME_KEYWORDS = 6; // descriptive terms kept per constellation
const RECENCY_HALF_LIFE_DAYS = 45; // brightness decay for quiet themes
const RECENT_WINDOW_DAYS = 21; // "recent ideas" horizon for the recency insight
const DAY_MS = 86_400_000;

// Folder co-membership is a softer relationship signal than a shared tag, so it
// contributes a fraction of a direct co-occurrence and only between a folder's
// dominant themes.
const FOLDER_EDGE_WEIGHT = 0.4;
const FOLDER_TOP_THEMES = 3;

const WEIGHT = { notes: 0.38, activity: 0.22, recency: 0.2, centrality: 0.12, structure: 0.08 };

// ─── Internal shapes ─────────────────────────────────────────────────────────

interface NoteRow {
  id: string;
  folderId: string | null;
  createdAt: Date;
  updatedAt: Date;
  versions: number;
  tagIds: string[];
  tokens: string[]; // kept with repeats for term frequency
}

interface ThemeAgg {
  id: string;
  title: string;
  source: ConstellationSource;
  color: string | null;
  noteCount: number;
  versions: number;
  folderNotes: number;
  firstActivity: number;
  lastActivity: number;
  termFreq: Map<string, number>; // for descriptive keywords
}

// ─── Math helpers ────────────────────────────────────────────────────────────

// Max-normalize a list to 0..1; a flat/empty list maps to 0 to avoid /0.
function normalizeByMax(values: number[]): number[] {
  const max = Math.max(0, ...values);
  return max === 0 ? values.map(() => 0) : values.map((v) => v / max);
}

function recencyDecay(lastMs: number, nowMs: number): number {
  const ageDays = Math.max(0, (nowMs - lastMs) / DAY_MS);
  return Math.pow(0.5, ageDays / RECENCY_HALF_LIFE_DAYS);
}

function pairKey(a: string, b: string): string {
  return a < b ? `${a} ${b}` : `${b} ${a}`;
}

// ─── Emergent keyword themes ─────────────────────────────────────────────────

// Terms that recur across notes but aren't already a tag become their own themes,
// so ideas the user never tagged still surface as constellations.
function pickKeywordThemes(notes: NoteRow[], tagNames: Set<string>): string[] {
  const df = new Map<string, number>();
  for (const note of notes) {
    for (const term of uniqueTerms(note.tokens)) {
      df.set(term, (df.get(term) || 0) + 1);
    }
  }

  const n = notes.length || 1;
  const salience = new Map<string, number>();
  for (const note of notes) {
    const tf = new Map<string, number>();
    for (const t of note.tokens) tf.set(t, (tf.get(t) || 0) + 1);
    for (const [term, freq] of tf) {
      const docFreq = df.get(term)!;
      if (docFreq < MIN_KEYWORD_NOTES || tagNames.has(term)) continue;
      const idf = Math.log(n / docFreq);
      salience.set(term, (salience.get(term) || 0) + freq * idf);
    }
  }

  return [...salience.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, MAX_KEYWORD_THEMES)
    .map(([term]) => term);
}

// ─── Aggregation ─────────────────────────────────────────────────────────────

function buildThemes(
  notes: NoteRow[],
  tagMeta: Map<string, { name: string; color: string }>,
  keywordTerms: string[],
): { themes: Map<string, ThemeAgg>; noteThemes: Map<string, string[]> } {
  const themes = new Map<string, ThemeAgg>();
  const noteThemes = new Map<string, string[]>();
  const keywordSet = new Set(keywordTerms);

  const ensure = (id: string, title: string, source: ConstellationSource, color: string | null): ThemeAgg => {
    let t = themes.get(id);
    if (!t) {
      t = {
        id, title, source, color,
        noteCount: 0, versions: 0, folderNotes: 0,
        firstActivity: Infinity, lastActivity: 0, termFreq: new Map(),
      };
      themes.set(id, t);
    }
    return t;
  };

  for (const note of notes) {
    const ids: string[] = [];

    for (const tagId of note.tagIds) {
      const meta = tagMeta.get(tagId);
      if (!meta) continue;
      ids.push(`tag:${tagId}`);
      ensure(`tag:${tagId}`, meta.name, 'tag', meta.color);
    }
    const noteTermSet = uniqueTerms(note.tokens);
    for (const term of keywordSet) {
      if (!noteTermSet.has(term)) continue;
      ids.push(`kw:${term}`);
      ensure(`kw:${term}`, term, 'keyword', null);
    }

    noteThemes.set(note.id, ids);

    const createdMs = note.createdAt.getTime();
    const updatedMs = note.updatedAt.getTime();
    for (const id of ids) {
      const t = themes.get(id)!;
      t.noteCount += 1;
      t.versions += note.versions;
      if (note.folderId) t.folderNotes += 1;
      t.firstActivity = Math.min(t.firstActivity, createdMs);
      t.lastActivity = Math.max(t.lastActivity, updatedMs);
      for (const term of note.tokens) t.termFreq.set(term, (t.termFreq.get(term) || 0) + 1);
    }
  }

  return { themes, noteThemes };
}

// ─── Edges ───────────────────────────────────────────────────────────────────

function buildEdges(notes: NoteRow[], noteThemes: Map<string, string[]>): Map<string, number> {
  const edges = new Map<string, number>();
  const add = (a: string, b: string, w: number) => {
    const key = pairKey(a, b);
    edges.set(key, (edges.get(key) || 0) + w);
  };

  // Direct co-occurrence: two themes on the same note.
  for (const ids of noteThemes.values()) {
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) add(ids[i], ids[j], 1);
    }
  }

  // Softer folder co-membership between a folder's dominant themes.
  const folderThemeCounts = new Map<string, Map<string, number>>();
  for (const note of notes) {
    if (!note.folderId) continue;
    const counts = folderThemeCounts.get(note.folderId) || new Map<string, number>();
    for (const id of noteThemes.get(note.id) || []) counts.set(id, (counts.get(id) || 0) + 1);
    folderThemeCounts.set(note.folderId, counts);
  }
  for (const counts of folderThemeCounts.values()) {
    const top = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, FOLDER_TOP_THEMES).map(([id]) => id);
    for (let i = 0; i < top.length; i++) {
      for (let j = i + 1; j < top.length; j++) add(top[i], top[j], FOLDER_EDGE_WEIGHT);
    }
  }

  return edges;
}

// ─── Insights ────────────────────────────────────────────────────────────────

function buildInsights(
  themes: ThemeAgg[],
  topEdge: { a: string; b: string } | null,
  nowMs: number,
): InsightFact[] {
  const facts: InsightFact[] = [];
  if (themes.length === 0) return facts;

  // Consistency: the long-running theme still alive recently.
  const consistent = [...themes]
    .filter((t) => t.noteCount >= MIN_KEYWORD_NOTES)
    .map((t) => ({ t, span: (t.lastActivity - t.firstActivity) / DAY_MS, decay: recencyDecay(t.lastActivity, nowMs) }))
    .filter((x) => x.span >= 60 && x.decay > 0.25)
    .sort((a, b) => b.span * b.decay - a.span * a.decay)[0];
  if (consistent) {
    facts.push({ kind: 'consistency', theme: consistent.t.title, months: Math.round(consistent.span / 30) });
  }

  if (topEdge) facts.push({ kind: 'connection', a: topEdge.a, b: topEdge.b });

  // Recency: where the freshest thinking concentrates.
  const recent = [...themes]
    .filter((t) => (nowMs - t.lastActivity) / DAY_MS <= RECENT_WINDOW_DAYS)
    .map((t) => ({ t, score: recencyDecay(t.lastActivity, nowMs) * t.noteCount }))
    .sort((a, b) => b.score - a.score)[0];
  if (recent) facts.push({ kind: 'recency', theme: recent.t.title });

  return facts;
}

// ─── Public builder ──────────────────────────────────────────────────────────

export async function buildConstellationGraph(userId: string): Promise<ConstellationGraphDTO> {
  const [bookmarks, rawNotes] = await Promise.all([
    prisma.bookmark.findMany({ where: { userId }, select: { id: true, name: true, color: true } }),
    prisma.note.findMany({
      where: { userId, isDeleted: false, isArchived: false },
      select: {
        id: true, content: true, folderId: true, createdAt: true, updatedAt: true,
        noteBookmarks: { select: { bookmarkId: true } },
        _count: { select: { versions: true } },
      },
    }),
  ]);

  const nowMs = Date.now();
  // Bookmarks become themes of source 'tag' (vs. emergent 'keyword' themes); the
  // 'tag' vocabulary here is the constellation protocol, not the data model.
  const tagMeta = new Map(bookmarks.map((t) => [t.id, { name: t.name, color: t.color }]));
  const tagNames = new Set(bookmarks.map((t) => t.name.toLowerCase()));

  const notes: NoteRow[] = rawNotes.map((n) => ({
    id: n.id,
    folderId: n.folderId,
    createdAt: n.createdAt,
    updatedAt: n.updatedAt,
    versions: n._count.versions,
    tagIds: n.noteBookmarks.map((nb) => nb.bookmarkId),
    tokens: tokenize(n.content),
  }));

  const keywordTerms = pickKeywordThemes(notes, tagNames);
  const { themes, noteThemes } = buildThemes(notes, tagMeta, keywordTerms);
  const edges = buildEdges(notes, noteThemes);

  const themeList = [...themes.values()];
  if (themeList.length === 0) {
    return { constellations: [], links: [], insights: [], generatedAt: new Date(nowMs).toISOString() };
  }

  // Centrality = summed incident edge weight; needed before importance.
  const centrality = new Map<string, number>();
  for (const [key, w] of edges) {
    const [a, b] = key.split(' ');
    centrality.set(a, (centrality.get(a) || 0) + w);
    centrality.set(b, (centrality.get(b) || 0) + w);
  }

  // Per-signal raw arrays, normalized independently so no single signal dominates.
  const notesSig = normalizeByMax(themeList.map((t) => t.noteCount));
  const activitySig = normalizeByMax(themeList.map((t) => t.versions + t.noteCount));
  const recencySig = normalizeByMax(themeList.map((t) => recencyDecay(t.lastActivity, nowMs)));
  const centralitySig = normalizeByMax(themeList.map((t) => centrality.get(t.id) || 0));
  const structureSig = themeList.map((t) => (t.noteCount ? t.folderNotes / t.noteCount : 0));

  const importanceRaw = themeList.map(
    (_, i) =>
      WEIGHT.notes * notesSig[i] +
      WEIGHT.activity * activitySig[i] +
      WEIGHT.recency * recencySig[i] +
      WEIGHT.centrality * centralitySig[i] +
      WEIGHT.structure * structureSig[i],
  );
  const importance = normalizeByMax(importanceRaw);

  const titleOf = (id: string) => themes.get(id)?.title ?? id;

  const constellations: ConstellationDTO[] = themeList
    .map((t, i) => ({
      id: t.id,
      title: t.title,
      source: t.source,
      color: t.color,
      importance: importance[i],
      noteCount: t.noteCount,
      keywords: [...t.termFreq.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([term]) => term)
        .filter((term) => term !== t.title.toLowerCase())
        .slice(0, MAX_THEME_KEYWORDS),
      firstActivity: new Date(t.firstActivity).toISOString(),
      lastActivity: new Date(t.lastActivity).toISOString(),
    }))
    .sort((a, b) => b.importance - a.importance);

  const maxEdge = Math.max(0, ...edges.values());
  const links: ConstellationLinkDTO[] = [...edges.entries()].map(([key, w]) => {
    const [source, target] = key.split(' ');
    return { source, target, weight: maxEdge ? w / maxEdge : 0 };
  });

  const topEdgeEntry = [...edges.entries()].sort((a, b) => b[1] - a[1])[0];
  const topEdge = topEdgeEntry
    ? (() => {
        const [a, b] = topEdgeEntry[0].split(' ');
        return { a: titleOf(a), b: titleOf(b) };
      })()
    : null;

  const insights = buildInsights(themeList, topEdge, nowMs);

  return { constellations, links, insights, generatedAt: new Date(nowMs).toISOString() };
}
