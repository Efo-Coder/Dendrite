import { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useConstellationStore } from '../store/useConstellationStore';
import { constellationService } from '../services/constellation.service';
import { activityPhrase, insightSentence } from '../lib/constellations';
import { ThemeNote } from '../types';
import ConstellationCanvas from '../components/constellations/ConstellationCanvas';
import ConstellationDetailPanel from '../components/constellations/ConstellationDetailPanel';
import ReflectionWhisper from '../components/constellations/ReflectionWhisper';
import BackButton from '../components/home/BackButton';

interface ConstellationsViewProps {
  onBack: () => void;
  onOpenNote: (id: string) => void;
}

const LEVEL1_MAX = 14; // only the major constellations at the universe level
const MIN_LINK_WEIGHT = 0.08;
const MAX_LINKS = 50;
const MAX_RELATED = 6;

const ConstellationsView = ({ onBack, onOpenNote }: ConstellationsViewProps) => {
  const graph = useConstellationStore((s) => s.graph);
  const isLoading = useConstellationStore((s) => s.isLoading);
  const fetchGraph = useConstellationStore((s) => s.fetchGraph);

  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [thoughtsOpen, setThoughtsOpen] = useState(false); // Level 3
  const [themeNotes, setThemeNotes] = useState<ThemeNote[]>([]);
  const [notesLoading, setNotesLoading] = useState(false);

  useEffect(() => {
    fetchGraph();
  }, [fetchGraph]);

  const visible = useMemo(
    () => (graph ? [...graph.constellations].sort((a, b) => b.importance - a.importance).slice(0, LEVEL1_MAX) : []),
    [graph],
  );
  const visibleIds = useMemo(() => new Set(visible.map((c) => c.id)), [visible]);
  const visibleLinks = useMemo(
    () =>
      (graph?.links ?? [])
        .filter((l) => visibleIds.has(l.source) && visibleIds.has(l.target) && l.weight >= MIN_LINK_WEIGHT)
        .sort((a, b) => b.weight - a.weight)
        .slice(0, MAX_LINKS),
    [graph, visibleIds],
  );

  const sentences = useMemo(() => (graph?.insights ?? []).map(insightSentence), [graph]);
  const hovered = useMemo(() => visible.find((c) => c.id === hoveredId) ?? null, [visible, hoveredId]);
  const selected = useMemo(() => visible.find((c) => c.id === selectedId) ?? null, [visible, selectedId]);

  // Related themes for the detail panel — kept within the visible sky so every
  // chip is itself selectable and on-screen.
  const relatedThemes = useMemo(() => {
    if (!selectedId) return [];
    const best = new Map<string, number>();
    for (const l of visibleLinks) {
      if (l.source === selectedId) best.set(l.target, Math.max(best.get(l.target) ?? 0, l.weight));
      else if (l.target === selectedId) best.set(l.source, Math.max(best.get(l.source) ?? 0, l.weight));
    }
    return [...best.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, MAX_RELATED)
      .map(([id]) => visible.find((c) => c.id === id))
      .filter((c): c is NonNullable<typeof c> => !!c)
      .map((c) => ({ id: c.id, title: c.title }));
  }, [selectedId, visibleLinks, visible]);

  const handleSelect = useCallback(
    (id: string | null) => {
      if (id && id === selectedId) return; // already open — don't reload/flicker
      setSelectedId(id);
      setThoughtsOpen(false); // a new (or cleared) theme always starts at Level 2
      if (!id) return;
      setNotesLoading(true);
      setThemeNotes([]);
      constellationService
        .getThemeNotes(id)
        .then(setThemeNotes)
        .catch(() => {})
        .finally(() => setNotesLoading(false));
    },
    [selectedId],
  );

  const enterThoughts = useCallback(() => setThoughtsOpen(true), []);
  const exitThoughts = useCallback(() => setThoughtsOpen(false), []);

  // Esc steps back one level at a time: thoughts → theme → universe.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (thoughtsOpen) {
        e.preventDefault();
        exitThoughts();
      } else if (selectedId) {
        e.preventDefault();
        handleSelect(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [thoughtsOpen, selectedId, handleSelect, exitThoughts]);

  const hasSky = visible.length > 0;

  return (
    <div className="constellations-stage">
      {hasSky && (
        <ConstellationCanvas
          constellations={visible}
          links={visibleLinks}
          hoveredId={hoveredId}
          selectedId={selectedId}
          level3={thoughtsOpen}
          notes={themeNotes}
          onHover={setHoveredId}
          onSelect={handleSelect}
          onOpenNote={onOpenNote}
        />
      )}

      <div className="constellations-topbar">
        <BackButton
          onClick={thoughtsOpen ? exitThoughts : selectedId ? () => handleSelect(null) : onBack}
          label={thoughtsOpen || selectedId ? 'Back' : 'Home'}
        />
      </div>

      {/* Top-left info slot: intro by default, hovered theme on focus. Hidden once
          a theme is selected — the detail panel carries the focus then. */}
      {hasSky && !selectedId && (
        <div className="constellations-info">
          {/* initial={false}: mount animations never fire inside this lazy view
              (motion + Suspense) — the first state stands, only swaps animate. */}
          <AnimatePresence mode="wait" initial={false}>
            {hovered ? (
              <motion.div
                key={hovered.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.35, ease: 'easeInOut' }}
              >
                <p className="constellations-eyebrow">{hovered.source === 'tag' ? 'Theme' : 'Emerging'}</p>
                <h2 className="constellations-title">{hovered.title}</h2>
                {hovered.keywords.length > 0 && (
                  <p className="constellations-keywords">{hovered.keywords.slice(0, 4).join('  ·  ')}</p>
                )}
                <p className="constellations-descriptor">{activityPhrase(hovered.lastActivity)}</p>
              </motion.div>
            ) : (
              <motion.div
                key="intro"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.35, ease: 'easeInOut' }}
              >
                <p className="constellations-eyebrow">Your arbor</p>
                <h2 className="constellations-title">An atlas of your thinking.</h2>
                <p className="constellations-descriptor">Follow a branch to its theme — click to enter it.</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      <AnimatePresence>
        {selected && (
          <ConstellationDetailPanel
            constellation={selected}
            related={relatedThemes}
            notes={themeNotes}
            loading={notesLoading}
            thoughtsOpen={thoughtsOpen}
            onSelectRelated={handleSelect}
            onEnterThoughts={enterThoughts}
            onLeaveThoughts={exitThoughts}
            onOpenNote={onOpenNote}
            onClose={() => handleSelect(null)}
          />
        )}
      </AnimatePresence>

      {hasSky && !selectedId && <ReflectionWhisper sentences={sentences} />}

      {!hasSky && (
        <div className="constellations-empty">
          <p className="constellations-eyebrow">Your arbor</p>
          <h2 className="constellations-title">
            {isLoading ? 'Tracing your branches…' : 'Your arbor is still taking root.'}
          </h2>
          {!isLoading && (
            <p className="constellations-descriptor">
              Write and tag a few notes — themes will branch as they grow.
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default ConstellationsView;
