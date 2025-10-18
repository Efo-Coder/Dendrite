import { formatDistanceToNow } from 'date-fns';
import { de } from 'date-fns/locale';
import { Note } from '../types';
import { Pin, Star, Lock, GripVertical, ArrowUp, ArrowDown } from 'lucide-react';
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
  getPreview: (content: string) => string;
  showDragHandle: boolean;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  noteRef?: (el: HTMLDivElement | null) => void;
}

const SortableNoteItem = ({ note, isSelected, onSelectNote, getPreview, showDragHandle, onMouseEnter, onMouseLeave, noteRef }: SortableNoteItemProps) => {
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
        'w-full border-b border-dark-border flex relative h-[120px]',
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
        className="flex-1 px-4 py-3 text-left flex flex-col min-w-0"
      >
        {/* Note Header */}
        <div className="flex items-start justify-between gap-2 min-w-0 mb-2">
          <h3 className="text-sm font-semibold text-dark-text-primary line-clamp-1 flex-1 min-w-0 break-words">
            {note.title}
          </h3>
          <div className="flex items-center space-x-1 flex-shrink-0">
            {note.isPinned && <Pin className="w-3 h-3 text-accent-green-500" />}
            {note.isFavorite && <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />}
            {note.isLocked && <Lock className="w-3 h-3 text-dark-text-muted" />}
          </div>
        </div>

        {/* Tags */}
        {note.tags && note.tags.length > 0 && (
          <div className="flex items-center space-x-1 flex-wrap gap-1 mb-2">
            {note.tags.slice(0, 3).map((tag, index) => (
              <span
                key={tag.id}
                className="px-1.5 text-xs rounded border whitespace-nowrap animate-fade-in"
                style={{ 
                  animationDelay: `${index * 100}ms`,
                  backgroundColor: `${tag.color || '#10b981'}20`,
                  color: tag.color || '#10b981',
                  borderColor: `${tag.color || '#10b981'}40`
                }}
              >
                {tag.name}
              </span>
            ))}
            {note.tags.length > 3 && (
              <span className="text-xs text-dark-text-muted whitespace-nowrap animate-fade-in">
                +{note.tags.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Note Preview */}
        <p className={clsx(
          "text-xs text-dark-text-secondary break-words min-w-0 mb-2 flex-1",
          note.tags && note.tags.length > 0 ? "line-clamp-1" : "line-clamp-3",
          !note.tags || note.tags.length === 0 ? "-mt-1" : ""
        )}>
          {getPreview(note.content) || '\u00A0'}
        </p>

        {/* Note Meta */}
        <div className="flex items-center justify-between gap-2 min-w-0 mt-auto">
          <span className="text-xs text-dark-text-muted flex-shrink-0">
            {formatDistanceToNow(new Date(note.updatedAt), {
              addSuffix: true,
              locale: de,
            })}
          </span>
        </div>
      </button>
    </div>
  );
};

type SortOption = 'createdAt' | 'updatedAt' | 'title' | 'pinned' | 'manual';

const NoteList = ({ notes, currentNote, onSelectNote, onNotesReordered, contextType, contextId, isTrash }: NoteListProps) => {
  const [localNotes, setLocalNotes] = useState(notes);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [highlighterStyle, setHighlighterStyle] = useState({ top: 0, height: 0 });
  const [sortBy, setSortBy] = useState<SortOption>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const noteRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Context-specific sorting state
  const getContextKey = () => `${contextType}-${contextId || '_none'}`;
  const [contextSortStates, setContextSortStates] = useState<Record<string, { sortBy: SortOption; sortOrder: 'asc' | 'desc' }>>({});

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    setLocalNotes(notes);
  }, [notes]);

  // Load context-specific sorting state when context changes
  useEffect(() => {
    const contextKey = getContextKey();
    const savedState = contextSortStates[contextKey];
    if (savedState) {
      setSortBy(savedState.sortBy);
      setSortOrder(savedState.sortOrder);
    } else {
      // Default sorting for new context
      setSortBy('createdAt');
      setSortOrder('desc');
    }
  }, [contextType, contextId]);

  // Save sorting state when it changes
  const updateSorting = (newSortBy: SortOption, newSortOrder: 'asc' | 'desc') => {
    setSortBy(newSortBy);
    setSortOrder(newSortOrder);
    
    const contextKey = getContextKey();
    setContextSortStates(prev => ({
      ...prev,
      [contextKey]: { sortBy: newSortBy, sortOrder: newSortOrder }
    }));
  };

  // Sortierung anwenden (außer bei manueller Sortierung)
  useEffect(() => {
    if (sortBy === 'manual') {
      return; // Bei manueller Sortierung keine automatische Sortierung
    }

    const sortedNotes = [...notes].sort((a, b) => {
      // Gepinnte Notizen immer zuerst
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;

      let comparison = 0;
      switch (sortBy) {
        case 'createdAt':
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
        case 'updatedAt':
          comparison = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
          break;
        case 'title':
          comparison = a.title.localeCompare(b.title);
          break;
        case 'pinned':
          comparison = a.isPinned === b.isPinned ? 0 : a.isPinned ? -1 : 1;
          break;
      }

      return sortOrder === 'desc' ? -comparison : comparison;
    });

    setLocalNotes(sortedNotes);
  }, [notes, sortBy, sortOrder]);

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

      // Setze Sortierung auf "manuell" nach Drag & Drop
      updateSorting('manual', sortOrder);

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
              'w-full border-b border-dark-border flex relative h-[120px]',
              currentNote?.id === note.id
                ? 'bg-accent-green-500/10'
                : ''
            )}
          >
            {/* Platzhalter für Drag Handle - damit Layout konsistent bleibt */}
            <div className="w-8 flex-shrink-0" />

            <button
              onClick={() => onSelectNote(note)}
              className="flex-1 px-4 py-3 text-left flex flex-col min-w-0"
            >
              {/* Note Header */}
              <div className="flex items-start justify-between gap-2 min-w-0 mb-2">
                <h3 className="text-sm font-semibold text-dark-text-primary line-clamp-1 flex-1 min-w-0 break-words">
                  {note.title}
                </h3>
                <div className="flex items-center space-x-1 flex-shrink-0">
                  {note.isPinned && <Pin className="w-3 h-3 text-accent-green-500" />}
                  {note.isFavorite && <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />}
                  {note.isLocked && <Lock className="w-3 h-3 text-dark-text-muted" />}
                </div>
              </div>

              {/* Tags */}
              {note.tags && note.tags.length > 0 && (
                <div className="flex items-center space-x-1 flex-wrap gap-1 mb-2">
                  {note.tags.slice(0, 3).map((tag, index) => (
                    <span
                      key={tag.id}
                      className="px-1.5 text-xs rounded border whitespace-nowrap animate-fade-in"
                      style={{ 
                        animationDelay: `${index * 100}ms`,
                        backgroundColor: `${tag.color || '#10b981'}20`,
                        color: tag.color || '#10b981',
                        borderColor: `${tag.color || '#10b981'}40`
                      }}
                    >
                      {tag.name}
                    </span>
                  ))}
                  {note.tags.length > 3 && (
                    <span className="text-xs text-dark-text-muted whitespace-nowrap animate-fade-in">
                      +{note.tags.length - 3}
                    </span>
                  )}
                </div>
              )}

              {/* Note Preview */}
              <p className={clsx(
                "text-xs text-dark-text-secondary break-words min-w-0 mb-2 flex-1",
                note.tags && note.tags.length > 0 ? "line-clamp-1" : "line-clamp-3",
                !note.tags || note.tags.length === 0 ? "-mt-1" : ""
              )}>
                {getPreview(note.content) || '\u00A0'}
              </p>

              {/* Note Meta */}
              <div className="flex items-center justify-between gap-2 min-w-0 mt-auto">
                <span className="text-xs text-dark-text-muted flex-shrink-0">
                  {formatDistanceToNow(new Date(note.updatedAt), {
                    addSuffix: true,
                    locale: de,
                  })}
                </span>
              </div>
            </button>
          </div>
        ))}
      </div>
    );
  }

  // Alle Ansichten: Mit Sortierung und Drag & Drop
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Sortierung Header */}
      <div className="px-4 py-3 border-b border-dark-border bg-dark-surface">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-dark-text-primary">Sortierung</span>
          <div className="flex items-center space-x-2">
            <select
              value={sortBy}
              onChange={(e) => updateSorting(e.target.value as SortOption, sortOrder)}
              className="px-3 py-1 bg-dark-elevated border border-dark-border rounded text-sm text-dark-text-primary"
            >
              <option value="createdAt">Erstellt</option>
              <option value="updatedAt">Aktualisiert</option>
              <option value="title">Titel</option>
              <option value="pinned">Angeheftet</option>
              <option value="manual">Manuell</option>
            </select>
            {sortBy !== 'manual' && (
              <button
                onClick={() => updateSorting(sortBy, sortOrder === 'desc' ? 'asc' : 'desc')}
                className="p-1 rounded text-dark-text-muted hover:bg-dark-elevated hover:text-dark-text-primary transition-colors"
                title={`Sortierung: ${sortOrder === 'desc' ? 'Absteigend' : 'Aufsteigend'}`}
              >
                {sortOrder === 'desc' ? <ArrowDown className="w-4 h-4" /> : <ArrowUp className="w-4 h-4" />}
              </button>
            )}
          </div>
        </div>
      </div>

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
              getPreview={getPreview}
              showDragHandle={!isTrash}
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