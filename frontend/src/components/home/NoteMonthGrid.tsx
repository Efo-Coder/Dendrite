import { useMemo, useRef } from 'react';
import { Note } from '../../types';
import { monthKeyOf } from '../noteList/noteListUtils';
import { noteLabel } from '../../lib/noteText';
import { timeAgo } from '../../lib/timeAgo';
import { trashCountdown } from '../../lib/trash';
import { useCardFlip } from '../../hooks/useCardFlip';
import { useLeaving } from '../../hooks/useLeaving';
import CoverCard from './CoverCard';

interface NoteMonthGridProps {
  notes: Note[];
  onOpen: (note: Note) => void;
  onMenu: (e: React.MouseEvent, note: Note) => void;
  onSetCover: (note: Note) => void;
  // Set true once the view's first network load has landed (gates the mount FLIP).
  armed?: boolean;
  // Trash view: show the "N Days" auto-purge countdown instead of "Last explored …".
  countdown?: boolean;
}

interface MonthGroupProps {
  label: string;
  items: Note[];
  onOpen: (note: Note) => void;
  onMenu: (e: React.MouseEvent, note: Note) => void;
  onSetCover: (note: Note) => void;
  armed?: boolean;
  countdown?: boolean;
}

// One month's grid, with FLIP shift + enter/leave animations.
const MonthGroup = ({ label, items, onOpen, onMenu, onSetCover, armed, countdown }: MonthGroupProps) => {
  const ref = useRef<HTMLDivElement | null>(null);
  useCardFlip(ref, armed);
  const rendered = useLeaving(items, (n) => n.id);
  return (
    <section className="notes-month-group">
      <div className="notes-month-label">{label}</div>
      <div ref={ref} className="home-card-grid">
        {rendered.map(({ item: note, leaving }, i) => {
          const cd = countdown ? trashCountdown(note.deletedAt) : null;
          return (
            <CoverCard
              key={note.id}
              index={i}
              leaving={leaving}
              flipId={note.id}
              title={noteLabel(note)}
              subtitle={cd ? cd.text : `Last explored ${timeAgo(note.updatedAt)}`}
              subtitleTone={cd && cd.tone !== 'normal' ? cd.tone : undefined}
              cover={note.coverImage}
              seed={note.id}
              onClick={() => onOpen(note)}
              onSetCover={() => onSetCover(note)}
              onContextMenu={(e) => onMenu(e, note)}
            />
          );
        })}
      </div>
    </section>
  );
};

// Notes laid out as cover cards, bucketed into month groups (newest first) with
// a label per month — the workspace list's grouping, in the Home card grid.
const NoteMonthGrid = ({ notes, onOpen, onMenu, onSetCover, armed, countdown }: NoteMonthGridProps) => {
  const groups = useMemo(() => {
    const sorted = [...notes].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    const map = new Map<string, Note[]>();
    for (const note of sorted) {
      const key = monthKeyOf(note);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(note);
    }
    return Array.from(map, ([label, items]) => ({ label, items }));
  }, [notes]);

  return (
    <>
      {groups.map((group) => (
        <MonthGroup
          key={group.label}
          label={group.label}
          items={group.items}
          onOpen={onOpen}
          onMenu={onMenu}
          onSetCover={onSetCover}
          armed={armed}
          countdown={countdown}
        />
      ))}
    </>
  );
};

export default NoteMonthGrid;
