import { useMemo } from 'react';
import { motion } from 'motion/react';
import { X } from 'lucide-react';
import { Constellation, ThemeNote } from '../../types';
import { activityPhrase } from '../../lib/constellations';

interface RelatedTheme {
  id: string;
  title: string;
}

interface ConstellationDetailPanelProps {
  constellation: Constellation;
  related: RelatedTheme[];
  notes: ThemeNote[];
  loading: boolean;
  thoughtsOpen: boolean;
  onSelectRelated: (id: string) => void;
  onEnterThoughts: () => void;
  onLeaveThoughts: () => void;
  onOpenNote: (id: string) => void;
  onClose: () => void;
}

const MAX_MARKS = 24; // most recent months shown on the growth trail
const MAX_RECENT = 5;

function monthLabel(key: string): string {
  const [y, m] = key.split('-');
  const names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${names[Number(m) - 1]} ${y}`.toUpperCase();
}

function timeAgo(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

const ConstellationDetailPanel = ({
  constellation,
  related,
  notes,
  loading,
  thoughtsOpen,
  onSelectRelated,
  onEnterThoughts,
  onLeaveThoughts,
  onOpenNote,
  onClose,
}: ConstellationDetailPanelProps) => {
  // Monthly activity over the theme's lifespan — a quiet trail, not a chart.
  const marks = useMemo(() => {
    const counts = new Map<string, number>();
    for (const n of notes) {
      const d = new Date(n.updatedAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      counts.set(key, (counts.get(key) || 0) + 1);
    }
    const start = new Date(constellation.firstActivity);
    const end = new Date(constellation.lastActivity);
    const cur = new Date(start.getFullYear(), start.getMonth(), 1);
    const last = new Date(end.getFullYear(), end.getMonth(), 1);
    const months: { key: string; count: number }[] = [];
    while (cur <= last && months.length < 240) {
      const key = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}`;
      months.push({ key, count: counts.get(key) || 0 });
      cur.setMonth(cur.getMonth() + 1);
    }
    return months.slice(-MAX_MARKS);
  }, [notes, constellation]);

  const maxCount = Math.max(1, ...marks.map((m) => m.count));
  const recent = notes.slice(0, MAX_RECENT);

  return (
    <motion.aside
      className="constellation-detail"
      initial={{ opacity: 0, x: 36 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 36 }}
      transition={{ duration: 0.4, ease: 'easeInOut' }}
    >
      <button type="button" className="constellation-detail-close" onClick={onClose} aria-label="Close">
        <X size={18} strokeWidth={1.75} />
      </button>
      <p className="constellations-eyebrow">{constellation.source === 'tag' ? 'Constellation' : 'Emerging theme'}</p>
      <h2 className="constellation-detail-title">{constellation.title}</h2>
      <p className="constellation-detail-status">{activityPhrase(constellation.lastActivity)}</p>

      {thoughtsOpen ? (
        <button type="button" className="constellation-enter" onClick={onLeaveThoughts}>
          <span aria-hidden>←</span> Leave the thoughts
        </button>
      ) : notes.length > 0 ? (
        <button type="button" className="constellation-enter" onClick={onEnterThoughts}>
          Enter the thoughts <span aria-hidden>→</span>
        </button>
      ) : null}

      {marks.length > 1 && (
        <div className="constellation-detail-block">
          <p className="constellation-detail-label">Growth</p>
          <div className="constellation-timeline">
            {marks.map((m) => (
              <span
                key={m.key}
                className="constellation-timeline-bar"
                style={{ height: `${6 + (m.count / maxCount) * 30}px` }}
              />
            ))}
          </div>
          <div className="constellation-timeline-axis">
            <span>{monthLabel(marks[0].key)}</span>
            <span>{monthLabel(marks[marks.length - 1].key)}</span>
          </div>
        </div>
      )}

      {related.length > 0 && (
        <div className="constellation-detail-block">
          <p className="constellation-detail-label">Related</p>
          <div className="constellation-related">
            {related.map((r) => (
              <button key={r.id} type="button" className="constellation-chip" onClick={() => onSelectRelated(r.id)}>
                {r.title}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="constellation-detail-block">
        <p className="constellation-detail-label">Recent activity</p>
        {loading ? (
          <p className="constellation-detail-empty">Gathering thoughts…</p>
        ) : recent.length === 0 ? (
          <p className="constellation-detail-empty">No notes here yet.</p>
        ) : (
          <ul className="constellation-recent">
            {recent.map((n) => (
              <li key={n.id}>
                <button type="button" className="constellation-recent-item" onClick={() => onOpenNote(n.id)}>
                  <span className="constellation-recent-title">{n.title?.trim() || n.preview || 'Untitled'}</span>
                  <span className="constellation-recent-time">{timeAgo(n.updatedAt)}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </motion.aside>
  );
};

export default ConstellationDetailPanel;
