import { Note } from '../../types';
import { GripVertical, Folder, Users } from 'lucide-react';
import { Icons } from '../ui/Icons';
import clsx from 'clsx';
import { Reorder, useDragControls, DragControls } from 'motion/react';
import { getNoteTitle, getFirstLine, getPreview, stripHtml } from './noteListUtils';

export interface NoteItemContentProps {
  note: Note;
  showDragHandle: boolean;
  dateDisplayMode: 'updatedAt' | 'createdAt';
  onSelectNote: (note: Note | null) => void;
  dragControls?: DragControls;
}

export const NoteItemContent = ({
  note,
  showDragHandle,
  dateDisplayMode,
  onSelectNote,
  dragControls,
}: NoteItemContentProps) => (
  <>
    {showDragHandle && (
      <div
        data-draggable
        onPointerDown={(e) => { e.preventDefault(); dragControls?.start(e); }}
        style={{
          position: 'absolute', left: 0, top: 0, bottom: 0,
          width: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'grab', color: 'var(--ink-dim)', zIndex: 2,
        }}
        className="active:cursor-grabbing hover:text-(--ink-low)"
      >
        <GripVertical style={{ width: '11px', height: '11px' }} />
      </div>
    )}
    <button
      onClick={() => onSelectNote(note)}
      style={{
        flex: 1, minWidth: 0, textAlign: 'left', background: 'none',
        border: 'none', cursor: 'pointer', padding: 0,
        paddingLeft: '18px',
      }}
    >
      <div className="note-card-head" style={{ position: 'relative' }}>
        {note.collaborators && note.collaborators.length > 0 && (
          <Users
            style={{
              position: 'absolute', right: '100%', top: '50%',
              transform: 'translateY(-50%)', marginRight: '5px',
              width: '9px', height: '9px', color: 'var(--accent)',
              flexShrink: 0,
            }}
          />
        )}
        <span className="note-card-title">{getNoteTitle(note)}</span>
        {note.isPinned && <Icons.pinFill size={11} className="note-card-pin" />}
      </div>
      <p className="note-card-preview">
        {note.title ? getFirstLine(note.content) : getPreview(note.content)}
      </p>
      <div className="note-card-folder">
        <Folder style={{ width: '9px', height: '9px', flexShrink: 0 }} />
        {note.folder?.name ?? 'All Notes'}
      </div>
      <div className="note-card-meta">
        <span>{new Date(dateDisplayMode === 'createdAt' ? note.createdAt : note.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
        <span className="block size-0.5 rounded-full bg-(--ink-dim) shrink-0 self-center -mt-px" />
        <span>{stripHtml(note.content).trim().split(/\s+/).filter(Boolean).length} words</span>
        {note.tags && note.tags.length > 0 && (
          <>
            <span className="block size-0.5 rounded-full bg-(--ink-dim) shrink-0 self-center -mt-px" />
            <span className="tag-pill">{note.tags[0].name}</span>
          </>
        )}
        {note.isFavorite && <><span style={{ flex: 1 }} /><Icons.starFill size={12} className="star" /></>}
      </div>
    </button>
  </>
);

export interface ReorderNoteItemProps {
  note: Note;
  isSelected: boolean;
  onSelectNote: (note: Note | null) => void;
  showDragHandle: boolean;
  dateDisplayMode: 'updatedAt' | 'createdAt';
  onRightClick?: (e: React.MouseEvent, note: Note) => void;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  onMouseEnter?: (e: React.MouseEvent<HTMLElement>) => void;
  onMouseLeave?: () => void;
}

const ReorderNoteItem = ({
  note,
  isSelected,
  onSelectNote,
  showDragHandle,
  dateDisplayMode,
  onRightClick,
  onDragStart,
  onDragEnd,
  onMouseEnter,
  onMouseLeave,
}: ReorderNoteItemProps) => {
  const controls = useDragControls();

  return (
    <Reorder.Item
      value={note}
      layout="position"
      initial={false}
      dragListener={false}
      dragControls={showDragHandle ? controls : undefined}
      drag={showDragHandle ? 'y' : false}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onContextMenu={(e: React.MouseEvent) => onRightClick?.(e, note)}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className={clsx('note-card', isSelected && 'active')}
      style={{ listStyle: 'none', position: 'relative' }}
    >
      <NoteItemContent
        note={note}
        showDragHandle={showDragHandle}
        dateDisplayMode={dateDisplayMode}
        onSelectNote={onSelectNote}
        dragControls={controls}
      />
    </Reorder.Item>
  );
};

export default ReorderNoteItem;
