import { formatDistanceToNow } from 'date-fns';
import { de } from 'date-fns/locale';
import { Note } from '../../types';
import { Pin, Star, Lock, GripVertical, Folder } from 'lucide-react';
import clsx from 'clsx';
import { motion, Reorder, useDragControls, DragControls } from 'motion/react';
import { getNoteTitle, getFirstLine, getPreview } from './noteListUtils';

export interface NoteItemContentProps {
  note: Note;
  isSelected: boolean;
  showDragHandle: boolean;
  dateDisplayMode: 'updatedAt' | 'createdAt';
  onSelectNote: (note: Note | null) => void;
  dragControls?: DragControls;
}

export const NoteItemContent = ({
  note,
  isSelected,
  showDragHandle,
  dateDisplayMode,
  onSelectNote,
  dragControls,
}: NoteItemContentProps) => (
  <>
    {showDragHandle ? (
      <div
        onPointerDown={(e) => { e.preventDefault(); dragControls?.start(e); }}
        className="relative z-[1] flex w-8 shrink-0 cursor-grab items-center justify-center self-stretch active:cursor-grabbing text-text-secondary hover:text-text-primary"
      >
        <GripVertical className="w-4 h-4" />
      </div>
    ) : (
      <div className="flex w-8 shrink-0 self-stretch items-center justify-center" aria-hidden />
    )}
    <button
      onClick={() => onSelectNote(note)}
      className="relative z-[1] flex min-h-0 min-w-0 flex-1 flex-col justify-center gap-1.5 px-4 py-2 text-left"
    >
      <div className="relative flex w-full min-w-0 shrink-0 items-center gap-2">
        <motion.span
          className="absolute -left-4 top-[calc(50%-4px)] w-2 h-2 rounded-full pointer-events-none bg-brand-primary"
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: isSelected ? 1 : 0, scale: isSelected ? 1 : 0 }}
          transition={{ duration: 0.4, scale: { type: 'spring', visualDuration: 0.4, bounce: 0.5 } }}
        />
        <h3 className="text-sm font-semibold text-text-primary truncate flex-shrink min-w-0">
          {getNoteTitle(note)}
        </h3>
        {note.tags && note.tags.length > 0 && (
          <span
            className="px-1.5 py-px text-xs rounded border whitespace-nowrap flex-shrink-0 max-w-[80px] truncate"
            style={{
              backgroundColor: `${note.tags[0].color || '#10b981'}20`,
              color: note.tags[0].color || '#10b981',
              borderColor: `${note.tags[0].color || '#10b981'}40`,
            }}
            title={note.tags[0].name}
          >
            {note.tags[0].name}
          </span>
        )}
        <div className="flex items-center space-x-1 flex-shrink-0 ml-auto">
          {note.isPinned && <Pin className="w-3 h-3 text-brand-primary" />}
          {note.isFavorite && <Star className="w-3 h-3 text-[#b8a574]" />}
          {note.isLocked && <Lock className="w-3 h-3 text-text-secondary" />}
        </div>
      </div>
      <p className="min-h-[1.125rem] min-w-0 shrink-0 truncate text-xs text-text-secondary">
        {note.title ? getFirstLine(note.content) : getPreview(note.content)}
      </p>
      <div className="flex min-w-0 shrink-0 items-center gap-1">
        <Folder className="w-3 h-3 flex-shrink-0 text-text-secondary" />
        <span className="truncate text-xs text-text-secondary">
          {note.folder?.name || 'Alle Notizen'}
        </span>
      </div>
      <div className="flex min-w-0 shrink-0 items-center justify-between gap-2">
        <span className="flex-shrink-0 text-xs text-text-secondary">
          {formatDistanceToNow(
            new Date(dateDisplayMode === 'createdAt' ? note.createdAt : note.updatedAt),
            { addSuffix: true, locale: de }
          )}
        </span>
      </div>
    </button>
  </>
);

export interface ReorderNoteItemProps {
  note: Note;
  isSelected: boolean;
  isLast: boolean;
  onSelectNote: (note: Note | null) => void;
  showDragHandle: boolean;
  dateDisplayMode: 'updatedAt' | 'createdAt';
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  noteRef?: (el: HTMLElement | null) => void;
  onRightClick?: (e: React.MouseEvent, note: Note) => void;
  onDragStart?: () => void;
  onDragEnd?: () => void;
}

const ReorderNoteItem = ({
  note,
  isSelected,
  isLast,
  onSelectNote,
  showDragHandle,
  dateDisplayMode,
  onMouseEnter,
  onMouseLeave,
  noteRef,
  onRightClick,
  onDragStart,
  onDragEnd,
}: ReorderNoteItemProps) => {
  const controls = useDragControls();

  return (
    <Reorder.Item
      value={note}
      initial={false}
      dragListener={false}
      dragControls={showDragHandle ? controls : undefined}
      drag={showDragHandle ? 'y' : false}
      ref={(el: HTMLElement | null) => noteRef?.(el)}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onContextMenu={(e: React.MouseEvent) => onRightClick?.(e, note)}
      className={clsx(
        'flex relative min-h-[108px] w-full list-none z-[1]',
        !isLast &&
          "after:pointer-events-none after:absolute after:bottom-0 after:left-6 after:right-6 after:z-0 after:content-[''] after:border-b after:border-divider",
        isSelected ? 'note-item-selected' : ''
      )}
    >
      <NoteItemContent
        note={note}
        isSelected={isSelected}
        showDragHandle={showDragHandle}
        dateDisplayMode={dateDisplayMode}
        onSelectNote={onSelectNote}
        dragControls={controls}
      />
    </Reorder.Item>
  );
};

export default ReorderNoteItem;
