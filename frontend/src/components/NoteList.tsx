import { formatDistanceToNow } from 'date-fns';
import { de } from 'date-fns/locale';
import { Note } from '../types';
import { Pin, Star, Lock, GripVertical } from 'lucide-react';
import clsx from 'clsx';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useState, useEffect, useRef } from 'react';
import { noteService } from '../services/note.service';

interface NoteListProps {
  notes: Note[];
  currentNote: Note | null;
  onSelectNote: (note: Note) => void;
  onNotesReordered?: () => void;
  contextType: string;
  contextId?: string;
  isTrash?: boolean;
}

interface SortableNoteItemProps {
  note: Note;
  isSelected: boolean;
  onSelectNote: (note: Note) => void;
  stripHtml: (html: string) => string;
  getPreview: (content: string) => string;
  showDragHandle: boolean;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  noteRef?: (el: HTMLDivElement | null) => void;
}

const SortableNoteItem = ({ note, isSelected, onSelectNote, stripHtml, getPreview, showDragHandle, onMouseEnter, onMouseLeave, noteRef }: SortableNoteItemProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: note.id, disabled: !showDragHandle });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : 1,
  };

  const combineRefs = (el: HTMLDivElement | null) => {
    setNodeRef(el);
    if (noteRef) noteRef(el);
  };

  return (
    <div
      ref={combineRefs}
      style={style}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className={clsx(
        'w-full border-b border-dark-border flex relative h-[100px]',
        isSelected
          ? 'bg-accent-green-500/10'
          : ''
      )}
    >
      {/* Drag Handle - nur anzeigen wenn nicht im Papierkorb */}
      {showDragHandle && (
        <div
          {...attributes}
          {...listeners}
          className="flex items-center justify-center w-8 flex-shrink-0 cursor-grab active:cursor-grabbing text-dark-text-muted hover:text-dark-text-primary"
        >
          <GripVertical className="w-4 h-4" />
        </div>
      )}

      {/* Note Content */}
      <button
        onClick={() => onSelectNote(note)}
        className="flex-1 p-4 text-left flex flex-col justify-between min-w-0"
      >
        {/* Note Header */}
        <div className="flex items-start justify-between gap-2 min-w-0">
          <h3 className="text-sm font-semibold text-dark-text-primary line-clamp-1 flex-1 min-w-0 break-words">
            {note.title}
          </h3>
          <div className="flex items-center space-x-1 flex-shrink-0">
            {note.isPinned && <Pin className="w-3 h-3 text-accent-green-500" />}
            {note.isFavorite && <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />}
            {note.isLocked && <Lock className="w-3 h-3 text-dark-text-muted" />}
          </div>
        </div>

        {/* Note Preview */}
        <p className="text-xs text-dark-text-secondary line-clamp-1 break-words min-w-0">
          {getPreview(note.content) || '\u00A0'}
        </p>

        {/* Note Meta */}
        <div className="flex items-center justify-between gap-2 min-w-0">
          <span className="text-xs text-dark-text-muted flex-shrink-0">
            {formatDistanceToNow(new Date(note.updatedAt), {
              addSuffix: true,
              locale: de,
            })}
          </span>
          {note.tags && note.tags.length > 0 && (
            <div className="flex items-center space-x-1 flex-shrink-0">
              {note.tags.slice(0, 2).map((tag) => (
                <span
                  key={tag.id}
                  className="px-1.5 py-0.5 bg-accent-green-500/10 text-accent-green-500 text-xs rounded border border-accent-green-500/20 whitespace-nowrap"
                >
                  {tag.name}
                </span>
              ))}
              {note.tags.length > 2 && (
                <span className="text-xs text-dark-text-muted whitespace-nowrap">+{note.tags.length - 2}</span>
              )}
            </div>
          )}
        </div>
      </button>
    </div>
  );
};

const NoteList = ({ notes, currentNote, onSelectNote, onNotesReordered, contextType, contextId, isTrash }: NoteListProps) => {
  const [localNotes, setLocalNotes] = useState(notes);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [highlighterStyle, setHighlighterStyle] = useState({ top: 0, height: 0 });
  const noteRefs = useRef<(HTMLDivElement | null)[]>([]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    setLocalNotes(notes);
  }, [notes]);

  const handleMouseEnter = (index: number) => {
    setHoveredIndex(index);
    const noteElement = noteRefs.current[index];
    if (noteElement) {
      const { offsetTop, offsetHeight } = noteElement;
      setHighlighterStyle({ top: offsetTop, height: offsetHeight });
    }
  };

  const handleMouseLeave = () => {
    setHoveredIndex(null);
  };

  const stripHtml = (html: string) => {
    const tmp = document.createElement('DIV');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
  };

  const getPreview = (content: string) => {
    const text = stripHtml(content);
    return text.length > 100 ? text.substring(0, 100) + '...' : text;
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = localNotes.findIndex((note) => note.id === active.id);
      const newIndex = localNotes.findIndex((note) => note.id === over.id);

      const reorderedNotes = arrayMove(localNotes, oldIndex, newIndex);
      setLocalNotes(reorderedNotes);

      // Speichere die neue Reihenfolge im Backend
      const noteOrders = reorderedNotes.map((note, index) => ({
        id: note.id,
        order: index,
      }));

      try {
        await noteService.reorderNotes(noteOrders, contextType, contextId || null);
        if (onNotesReordered) onNotesReordered();
      } catch (error) {
        console.error('Fehler beim Speichern der Reihenfolge:', error);
        // Rollback bei Fehler
        setLocalNotes(notes);
      }
    }
  };

  if (notes.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 text-center">
        <div className="text-dark-text-muted">
          <p className="text-sm">Keine Notizen gefunden</p>
        </div>
      </div>
    );
  }

  // Im Papierkorb: Kein Drag & Drop
  if (isTrash) {
    return (
      <div className="flex-1 overflow-y-scroll relative scrollbar-hide">
        {/* Highlighter */}
        {hoveredIndex !== null && (
          <div
            className="absolute left-0 w-full bg-white/5 backdrop-blur-sm pointer-events-none transition-all duration-500 ease-[cubic-bezier(0.59,0.04,0.3,1.43)]"
            style={{
              top: `${highlighterStyle.top}px`,
              height: `${highlighterStyle.height}px`,
            }}
          />
        )}

        {localNotes.map((note, index) => (
          <div
            key={note.id}
            ref={(el) => (noteRefs.current[index] = el)}
            onMouseEnter={() => handleMouseEnter(index)}
            onMouseLeave={handleMouseLeave}
            className={clsx(
              'w-full border-b border-dark-border flex relative h-[100px]',
              currentNote?.id === note.id
                ? 'bg-accent-green-500/10'
                : ''
            )}
          >
            {/* Platzhalter für Drag Handle - damit Layout konsistent bleibt */}
            <div className="w-8 flex-shrink-0" />

            <button
              onClick={() => onSelectNote(note)}
              className="flex-1 p-4 text-left flex flex-col justify-between min-w-0"
            >
              {/* Note Header */}
              <div className="flex items-start justify-between gap-2 min-w-0">
                <h3 className="text-sm font-semibold text-dark-text-primary line-clamp-1 flex-1 min-w-0 break-words">
                  {note.title}
                </h3>
                <div className="flex items-center space-x-1 flex-shrink-0">
                  {note.isPinned && <Pin className="w-3 h-3 text-accent-green-500" />}
                  {note.isFavorite && <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />}
                  {note.isLocked && <Lock className="w-3 h-3 text-dark-text-muted" />}
                </div>
              </div>

              {/* Note Preview */}
              <p className="text-xs text-dark-text-secondary line-clamp-1 break-words min-w-0">
                {getPreview(note.content) || '\u00A0'}
              </p>

              {/* Note Meta */}
              <div className="flex items-center justify-between gap-2 min-w-0">
                <span className="text-xs text-dark-text-muted flex-shrink-0">
                  {formatDistanceToNow(new Date(note.updatedAt), {
                    addSuffix: true,
                    locale: de,
                  })}
                </span>
                {note.tags && note.tags.length > 0 && (
                  <div className="flex items-center space-x-1 flex-shrink-0">
                    {note.tags.slice(0, 2).map((tag) => (
                      <span
                        key={tag.id}
                        className="px-1.5 py-0.5 bg-accent-green-500/10 text-accent-green-500 text-xs rounded border border-accent-green-500/20 whitespace-nowrap"
                      >
                        {tag.name}
                      </span>
                    ))}
                    {note.tags.length > 2 && (
                      <span className="text-xs text-dark-text-muted whitespace-nowrap">+{note.tags.length - 2}</span>
                    )}
                  </div>
                )}
              </div>
            </button>
          </div>
        ))}
      </div>
    );
  }

  // Normale Ansichten: Mit Drag & Drop
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={localNotes.map(note => note.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="flex-1 overflow-y-auto relative scrollbar-hide">
          {/* Highlighter */}
          {hoveredIndex !== null && (
            <div
              className="absolute left-0 w-full bg-white/5 backdrop-blur-sm pointer-events-none transition-all duration-500 ease-[cubic-bezier(0.59,0.04,0.3,1.43)]"
              style={{
                top: `${highlighterStyle.top}px`,
                height: `${highlighterStyle.height}px`,
              }}
            />
          )}

          {localNotes.map((note, index) => (
            <SortableNoteItem
              key={note.id}
              note={note}
              isSelected={currentNote?.id === note.id}
              onSelectNote={onSelectNote}
              stripHtml={stripHtml}
              getPreview={getPreview}
              showDragHandle={true}
              onMouseEnter={() => handleMouseEnter(index)}
              onMouseLeave={handleMouseLeave}
              noteRef={(el) => (noteRefs.current[index] = el)}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
    </div>
  );
};

export default NoteList;
