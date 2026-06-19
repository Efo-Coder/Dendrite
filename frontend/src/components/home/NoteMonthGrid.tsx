import { useMemo } from 'react';
import { Note } from '../../types';
import { monthKeyOf } from '../noteList/noteListUtils';
import { noteLabel } from '../../lib/noteText';
import CoverCard from './CoverCard';

interface NoteMonthGridProps {
  notes: Note[];
  onOpen: (note: Note) => void;
  onMenu: (e: React.MouseEvent, note: Note) => void;
  onSetCover: (note: Note) => void;
}

// Notes laid out as cover cards, bucketed into month groups (newest first) with
// a label per month — the workspace list's grouping, in the Home card grid.
const NoteMonthGrid = ({ notes, onOpen, onMenu, onSetCover }: NoteMonthGridProps) => {
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
        <section key={group.label} className="notes-month-group">
          <div className="notes-month-label">{group.label}</div>
          <div className="home-card-grid">
            {group.items.map((note) => (
              <CoverCard
                key={note.id}
                title={noteLabel(note)}
                cover={note.coverImage}
                seed={note.id}
                onClick={() => onOpen(note)}
                onSetCover={() => onSetCover(note)}
                onContextMenu={(e) => onMenu(e, note)}
              />
            ))}
          </div>
        </section>
      ))}
    </>
  );
};

export default NoteMonthGrid;
