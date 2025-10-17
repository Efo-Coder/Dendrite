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
import { useState, useEffect } from 'react';
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
}

const SortableNoteItem = ({ note, isSelected, onSelectNote, stripHtml, getPreview, showDragHandle }: SortableNoteItemProps) => {
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
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={clsx(
        'w-full border-b border-dark-border flex',
        isSelected
          ? 'bg-accent-green-500/10 border-l-2 border-l-accent-green-500'
          : 'hover:bg-dark-elevated'
      )}
    >
      {/* Drag Handle - nur anzeigen wenn nicht im Papierkorb */}
      {showDragHandle && (
        <div
          {...attributes}
          {...listeners}
          className="flex items-center justify-center w-8 cursor-grab active:cursor-grabbing text-dark-text-muted hover:text-dark-text-primary"
        >
          <GripVertical className="w-4 h-4" />
        </div>
      )}

      {/* Note Content */}
      <button
        onClick={() => onSelectNote(note)}
        className="flex-1 p-4 text-left"
      >
        {/* Note Header */}
        <div className="flex items-start justify-between mb-2">
          <h3 className="text-sm font-semibold text-dark-text-primary line-clamp-1 flex-1">
            {note.title}
          </h3>
          <div className="flex items-center space-x-1 ml-2">
            {note.isPinned && <Pin className="w-3 h-3 text-accent-green-500" />}
            {note.isFavorite && <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />}
            {note.isLocked && <Lock className="w-3 h-3 text-dark-text-muted" />}
          </div>
        </div>

        {/* Note Preview */}
        <p className="text-xs text-dark-text-secondary line-clamp-2 mb-2">
          {getPreview(note.content)}
        </p>

        {/* Note Meta */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-dark-text-muted">
            {formatDistanceToNow(new Date(note.updatedAt), {
              addSuffix: true,
              locale: de,
            })}
          </span>
          {note.tags && note.tags.length > 0 && (
            <div className="flex items-center space-x-1">
              {note.tags.slice(0, 2).map((tag) => (
                <span
                  key={tag.id}
                  className="px-1.5 py-0.5 bg-accent-green-500/10 text-accent-green-500 text-xs rounded border border-accent-green-500/20"
                >
                  {tag.name}
                </span>
              ))}
              {note.tags.length > 2 && (
                <span className="text-xs text-dark-text-muted">+{note.tags.length - 2}</span>
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

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    setLocalNotes(notes);
  }, [notes]);

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
      <div className="flex-1 overflow-y-auto">
        {localNotes.map((note) => (
          <div
            key={note.id}
            className={clsx(
              'w-full border-b border-dark-border flex',
              currentNote?.id === note.id
                ? 'bg-accent-green-500/10 border-l-2 border-l-accent-green-500'
                : 'hover:bg-dark-elevated'
            )}
          >
            <button
              onClick={() => onSelectNote(note)}
              className="flex-1 p-4 text-left"
            >
              {/* Note Header */}
              <div className="flex items-start justify-between mb-2">
                <h3 className="text-sm font-semibold text-dark-text-primary line-clamp-1 flex-1">
                  {note.title}
                </h3>
                <div className="flex items-center space-x-1 ml-2">
                  {note.isPinned && <Pin className="w-3 h-3 text-accent-green-500" />}
                  {note.isFavorite && <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />}
                  {note.isLocked && <Lock className="w-3 h-3 text-dark-text-muted" />}
                </div>
              </div>

              {/* Note Preview */}
              <p className="text-xs text-dark-text-secondary line-clamp-2 mb-2">
                {getPreview(note.content)}
              </p>

              {/* Note Meta */}
              <div className="flex items-center justify-between">
                <span className="text-xs text-dark-text-muted">
                  {formatDistanceToNow(new Date(note.updatedAt), {
                    addSuffix: true,
                    locale: de,
                  })}
                </span>
                {note.tags && note.tags.length > 0 && (
                  <div className="flex items-center space-x-1">
                    {note.tags.slice(0, 2).map((tag) => (
                      <span
                        key={tag.id}
                        className="px-1.5 py-0.5 bg-accent-green-500/10 text-accent-green-500 text-xs rounded border border-accent-green-500/20"
                      >
                        {tag.name}
                      </span>
                    ))}
                    {note.tags.length > 2 && (
                      <span className="text-xs text-dark-text-muted">+{note.tags.length - 2}</span>
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
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={localNotes.map(note => note.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="flex-1 overflow-y-auto">
          {localNotes.map((note) => (
            <SortableNoteItem
              key={note.id}
              note={note}
              isSelected={currentNote?.id === note.id}
              onSelectNote={onSelectNote}
              stripHtml={stripHtml}
              getPreview={getPreview}
              showDragHandle={true}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
};

export default NoteList;
