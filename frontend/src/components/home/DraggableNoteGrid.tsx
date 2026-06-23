import { useRef } from 'react';
import { Note } from '../../types';
import { noteLabel } from '../../lib/noteText';
import { timeAgo } from '../../lib/timeAgo';
import { useGridReorder } from './useGridReorder';
import { useLeaving } from '../../hooks/useLeaving';
import CoverCard from './CoverCard';

interface DraggableNoteGridProps {
  notes: Note[];
  onOpen: (note: Note) => void;
  onMenu: (e: React.MouseEvent, note: Note) => void;
  onSetCover: (note: Note) => void;
  // Omit to render a plain (non-draggable) grid, e.g. the pinned group on the all view.
  onReorder?: (notes: Note[]) => void;
  // Set true once the view's first network load has landed (gates the mount FLIP).
  armed?: boolean;
  // Show the "Last explored …" subtitle — on the full-page category views, not the container view.
  showSubtitle?: boolean;
}

const NOOP = () => {};

// Flat cover-card grid for the category views. With onReorder set, cards reorder via
// 2D pointer-drag + FLIP (useGridReorder) and the new order is persisted by the caller.
const DraggableNoteGrid = ({ notes, onOpen, onMenu, onSetCover, onReorder, armed, showSubtitle }: DraggableNoteGridProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const draggable = !!onReorder;
  const { order, draggingId, onCardPointerDown } = useGridReorder({
    items: notes,
    getId: (n) => n.id,
    containerRef,
    onReorder: onReorder ?? NOOP,
    armed,
  });
  const list = draggable ? order : notes;
  const rendered = useLeaving(list, (n) => n.id);

  return (
    <div ref={containerRef} className="home-card-grid">
      {rendered.map(({ item: note, leaving }, i) => (
        <CoverCard
          key={note.id}
          index={i}
          leaving={leaving}
          flipId={note.id}
          dragging={draggingId === note.id}
          onPointerDown={draggable && !leaving ? (e) => onCardPointerDown(e, note) : undefined}
          title={noteLabel(note)}
          subtitle={showSubtitle ? `Last explored ${timeAgo(note.updatedAt)}` : undefined}
          cover={note.coverImage}
          seed={note.id}
          onClick={() => onOpen(note)}
          onSetCover={() => onSetCover(note)}
          onContextMenu={(e) => onMenu(e, note)}
        />
      ))}
    </div>
  );
};

export default DraggableNoteGrid;
