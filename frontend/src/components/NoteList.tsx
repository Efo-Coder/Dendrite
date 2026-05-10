import { formatDistanceToNow } from 'date-fns';
import { de } from 'date-fns/locale';
import { Note } from '../types';
import { Pin, Star, Lock, GripVertical, ArrowUp, ArrowDown, Folder, ChevronDown } from 'lucide-react';
import { useGlassPill } from '../hooks/useGlassPill';
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
import { createPortal } from 'react-dom';
import { noteService } from '../services/note.service';
import { useNoteStore } from '../store/useNoteStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { useToast } from './ToastContainer';
import NoteContextMenu from './NoteContextMenu';
import MoveToFolderModal from './modals/MoveToFolderModal';
import TagSelectionModal from './modals/TagSelectionModal';

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
  getFirstLine: (content: string) => string;
  showDragHandle: boolean;
  dateDisplayMode: 'updatedAt' | 'createdAt';
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  noteRef?: (el: HTMLDivElement | null) => void;
  onRightClick?: (e: React.MouseEvent, note: Note) => void;
}

const SortableNoteItem = ({ note, isSelected, onSelectNote, getPreview, getFirstLine, showDragHandle, dateDisplayMode, onMouseEnter, onMouseLeave, noteRef, onRightClick }: SortableNoteItemProps) => {
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
      onContextMenu={(e) => onRightClick?.(e, note)}
      className={clsx(
        'flex relative h-[100px] transition-colors',
        isSelected ? 'note-item-selected mx-[3px] w-[calc(100%-6px)]' : 'w-full'
      )}
    >
      {/* Drag Handle - nur anzeigen wenn nicht im Papierkorb */}
      {showDragHandle && (
        <div
          {...attributes}
          {...listeners}
          className="flex items-center justify-center w-8 flex-shrink-0 cursor-grab active:cursor-grabbing text-text-secondary hover:text-text-primary"
        >
          <GripVertical className="w-4 h-4" />
        </div>
      )}

      {/* Note Content */}
      <button
        onClick={() => onSelectNote(note)}
        className="flex-1 px-4 py-2 text-left flex flex-col justify-between min-w-0"
      >
        {/* Note Header mit Title, Tag und Icons */}
        <div className="flex items-center gap-2 min-w-0">
          {/* Title */}
          <h3 className="text-sm font-semibold text-text-primary truncate flex-shrink min-w-0">
            {getFirstLine(note.content)}
          </h3>

          {/* Tag - nur der erste, weiter rechts positioniert */}
          {note.tags && note.tags.length > 0 && (
            <span
              className="px-1.5 py-px text-xs rounded border whitespace-nowrap flex-shrink-0 max-w-[80px] truncate ml-auto"
              style={{
                backgroundColor: `${note.tags[0].color || '#10b981'}20`,
                color: note.tags[0].color || '#10b981',
                borderColor: `${note.tags[0].color || '#10b981'}40`
              }}
              title={note.tags[0].name}
            >
              {note.tags[0].name}
            </span>
          )}

          {/* Icons */}
          <div className="flex items-center space-x-1 flex-shrink-0">
            {note.isPinned && <Pin className="w-3 h-3 text-brand-primary" />}
            {note.isFavorite && <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />}
            {note.isLocked && <Lock className="w-3 h-3 text-text-secondary" />}
          </div>
        </div>

        {/* Note Preview - nur eine Zeile */}
        <p className="text-xs text-text-secondary truncate min-w-0">
          {getPreview(note.content)}
        </p>

        {/* Folder Info */}
        <div className="flex items-center gap-1 min-w-0">
          <Folder className="w-3 h-3 text-text-secondary flex-shrink-0" />
          <span className="text-xs text-text-secondary truncate">
            {note.folder?.name || 'Alle Notizen'}
          </span>
        </div>

        {/* Note Meta */}
        <div className="flex items-center justify-between gap-2 min-w-0">
          <span className="text-xs text-text-secondary flex-shrink-0">
            {formatDistanceToNow(new Date(dateDisplayMode === 'createdAt' ? note.createdAt : note.updatedAt), {
              addSuffix: true,
              locale: de,
            })}
          </span>
        </div>
      </button>
      {!isSelected && <div className="absolute bottom-0 inset-x-5 h-px glass-divider" />}
    </div>
  );
};

type SortOption = 'createdAt' | 'updatedAt' | 'title' | 'pinned' | 'manual';

const NoteList = ({ notes, currentNote, onSelectNote, onNotesReordered, contextType, contextId, isTrash }: NoteListProps) => {
  const { updateNote, togglePin, toggleFavorite, toggleArchive, toggleTrash, deleteNote } = useNoteStore();
  const { dateDisplayMode } = useSettingsStore();
  const toast = useToast();
  
  const [localNotes, setLocalNotes] = useState(notes);
  const [hoveredNoteId, setHoveredNoteId] = useState<string | null>(null);
  const [highlighterStyle, setHighlighterStyle] = useState({ top: 0, height: 0 });
  const [sortBy, setSortBy] = useState<SortOption>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [sortDropdownPos, setSortDropdownPos] = useState({ top: 0, left: 0, width: 0 });
  const noteRefs = useRef<(HTMLDivElement | null)[]>([]);
  const sortDropdownRef = useRef<HTMLDivElement>(null);
  const sortTriggerRef = useRef<HTMLButtonElement>(null);
  const { pill: sortPill, onEnter: onSortEnter, onLeave: onSortLeave } = useGlassPill(sortDropdownRef);

  const sortLabels: Partial<Record<SortOption, string>> = {
    createdAt: 'Erstellt',
    updatedAt: 'Aktualisiert',
    title: 'Titel',
    manual: 'Manuell',
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        sortDropdownRef.current && !sortDropdownRef.current.contains(e.target as Node) &&
        sortTriggerRef.current && !sortTriggerRef.current.contains(e.target as Node)
      ) {
        setShowSortDropdown(false);
      }
    };
    if (showSortDropdown) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showSortDropdown]);

  // Context-specific sorting state
  const getContextKey = () => `${contextType}-${contextId || '_none'}`;
  const [contextSortStates, setContextSortStates] = useState<Record<string, { sortBy: SortOption; sortOrder: 'asc' | 'desc' }>>({});

  // Context menu state
  const [contextMenu, setContextMenu] = useState<{
    isOpen: boolean;
    position: { x: number; y: number };
    note: Note | null;
  }>({
    isOpen: false,
    position: { x: 0, y: 0 },
    note: null,
  });

  // Modal states
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [showTagModal, setShowTagModal] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
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

  // Context menu handlers
  const handleNoteRightClick = (e: React.MouseEvent, note: Note) => {
    e.preventDefault();
    e.stopPropagation();
    
    setContextMenu({
      isOpen: true,
      position: { x: e.clientX, y: e.clientY },
      note,
    });
  };

  const closeContextMenu = () => {
    setContextMenu(prev => ({
      ...prev,
      isOpen: false,
      position: { x: 0, y: 0 },
    }));
  };

  const handleEdit = () => {
    if (contextMenu.note) {
      setHoveredNoteId(null);
      onSelectNote(contextMenu.note);
    }
  };

  const handleMove = () => {
    setShowMoveModal(true);
  };

  const handleMoveToFolder = async (folderId: string | null) => {
    if (contextMenu.note) {
      try {
        await updateNote(contextMenu.note.id, { folderId });
        toast.success('Notiz verschoben');
        if (onNotesReordered) onNotesReordered();
      } catch (error) {
        toast.error('Fehler beim Verschieben');
      }
    }
  };

  const handlePin = async () => {
    if (contextMenu.note) {
      try {
        await togglePin(contextMenu.note.id);
        toast.success(contextMenu.note.isPinned ? 'Anheften entfernt' : 'Notiz angeheftet');
        if (onNotesReordered) onNotesReordered();
      } catch (error) {
        toast.error('Fehler beim Anheften');
      }
    }
  };

  const handleFavorite = async () => {
    if (contextMenu.note) {
      try {
        await toggleFavorite(contextMenu.note.id);
        toast.success(contextMenu.note.isFavorite ? 'Aus Favoriten entfernt' : 'Zu Favoriten hinzugefügt');
        if (onNotesReordered) onNotesReordered();
      } catch (error) {
        toast.error('Fehler beim Favorisieren');
      }
    }
  };

  const handleArchive = async () => {
    if (contextMenu.note) {
      try {
        await toggleArchive(contextMenu.note.id);
        toast.success(contextMenu.note.isArchived ? 'Aus Archiv geholt' : 'Notiz archiviert');
        if (onNotesReordered) onNotesReordered();
      } catch (error) {
        toast.error('Fehler beim Archivieren');
      }
    }
  };

  const handleTag = () => {
    setShowTagModal(true);
  };

  const handleUpdateTags = async (tagIds: string[]) => {
    if (contextMenu.note) {
      try {
        await updateNote(contextMenu.note.id, { tags: tagIds });
        toast.success('Tags aktualisiert');
        if (onNotesReordered) onNotesReordered();
      } catch (error) {
        toast.error('Fehler beim Aktualisieren der Tags');
      }
    }
  };

  const handleDelete = async () => {
    if (contextMenu.note) {
      if (contextMenu.note.isDeleted) {
        // Permanent delete
        try {
          await deleteNote(contextMenu.note.id);
          toast.error('Notiz endgültig gelöscht');
          if (onNotesReordered) onNotesReordered();
        } catch (error) {
          toast.error('Fehler beim Löschen');
        }
      } else {
        // Move to trash
        try {
          await toggleTrash(contextMenu.note.id);
          toast.error('Notiz gelöscht');
          if (onNotesReordered) onNotesReordered();
        } catch (error) {
          toast.error('Fehler beim Löschen der Notiz');
        }
      }
    }
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
          const aTitleText = getFirstLine(a.content);
          const bTitleText = getFirstLine(b.content);
          comparison = aTitleText.localeCompare(bTitleText);
          break;
        case 'pinned':
          comparison = a.isPinned === b.isPinned ? 0 : a.isPinned ? -1 : 1;
          break;
      }

      return sortOrder === 'desc' ? -comparison : comparison;
    });

    setLocalNotes(sortedNotes);
  }, [notes, sortBy, sortOrder]);

  // Pill-Position nach Re-Sortierung aktualisieren
  useEffect(() => {
    if (hoveredNoteId === null) return;
    const newIndex = localNotes.findIndex(n => n.id === hoveredNoteId);
    if (newIndex < 0) {
      setHoveredNoteId(null);
      return;
    }
    const noteElement = noteRefs.current[newIndex];
    if (noteElement) {
      const { offsetTop, offsetHeight } = noteElement;
      setHighlighterStyle({ top: offsetTop, height: offsetHeight });
    }
  }, [localNotes]);

  const handleMouseEnter = (index: number, noteId: string) => {
    setHoveredNoteId(noteId);
    const noteElement = noteRefs.current[index];
    if (noteElement) {
      const { offsetTop, offsetHeight } = noteElement;
      setHighlighterStyle({ top: offsetTop, height: offsetHeight });
    }
  };

  const handleMouseLeave = () => {
    setHoveredNoteId(null);
  };

  const handleSelectNote = (note: Note) => {
    setHoveredNoteId(null);
    onSelectNote(note);
  };

  const stripHtml = (html: string) => {
    const tmp = document.createElement('DIV');
    tmp.innerHTML = html;

    // Ersetze Bilder durch ihren Dateinamen (alt-Attribut)
    tmp.querySelectorAll('img').forEach((img) => {
      const name = img.getAttribute('alt') || img.getAttribute('src')?.split('/').pop()?.split('?')[0] || 'Uploaded Image';
      img.replaceWith(document.createTextNode(name));
    });

    // Ersetze Block-Level-Elemente durch Zeilenumbrüche
    const blockElements = tmp.querySelectorAll('p, div, h1, h2, h3, h4, h5, h6, li, br');
    blockElements.forEach((el) => {
      if (el.tagName === 'BR') {
        el.replaceWith('\n');
      } else {
        const textNode = document.createTextNode('\n' + (el.textContent || '') + '\n');
        el.replaceWith(textNode);
      }
    });

    return tmp.textContent || tmp.innerText || '';
  };

  const getFirstLine = (content: string) => {
    const text = stripHtml(content);
    // Erste Zeile bis zum ersten Zeilenumbruch
    const lines = text.split('\n').map(line => line.trim()).filter(line => line !== '');
    const firstLine = lines[0] || 'Neue Notiz';
    // Truncate wenn zu lang (maximal 50 Zeichen)
    return firstLine.length > 50 ? firstLine.substring(0, 50) + '...' : firstLine;
  };

  const getPreview = (content: string) => {
    const text = stripHtml(content);
    const lines = text.split('\n').map(line => line.trim()).filter(line => line !== '');

    // Wenn es keine zweite Zeile gibt, gib "Kein zusätzlicher Text" zurück
    if (lines.length < 2) return 'Kein zusätzlicher Text';

    // Nimm nur die zweite Zeile (Index 1)
    const secondLine = lines[1];

    // Truncate wenn zu lang (maximal 100 Zeichen)
    return secondLine.length > 100 ? secondLine.substring(0, 100) + '...' : secondLine;
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
        <div className="text-text-secondary">
          <p className="text-sm">Keine Notizen gefunden</p>
        </div>
      </div>
    );
  }

  // Im Papierkorb: Kein Drag & Drop
  if (isTrash) {
    return (
      <>
      <div className="flex-1 relative scrollbar-overlay">
        {/* Glass Pill Hover */}
        {hoveredNoteId !== null && (
          <div
            className="glass-pill pointer-events-none transition-all duration-300 ease-[cubic-bezier(0.59,0.04,0.3,1.43)]"
            style={{
              left: 1,
              top: highlighterStyle.top,
              width: 'calc(100% - 2px)',
              height: highlighterStyle.height,
            }}
          />
        )}

        {localNotes.map((note, index) => (
          <div
            key={note.id}
            ref={(el) => (noteRefs.current[index] = el)}
            onMouseEnter={() => handleMouseEnter(index, note.id)}
            onMouseLeave={handleMouseLeave}
            onContextMenu={(e) => handleNoteRightClick(e, note)}
            className={clsx(
              'w-full flex relative h-[100px] transition-colors',
              currentNote?.id === note.id ? 'bg-brand-primary/10 ring-1 ring-inset ring-[color-mix(in_srgb,var(--color-brand-primary)_55%,transparent)] rounded-lg' : ''
            )}
          >
            {/* Platzhalter für Drag Handle - damit Layout konsistent bleibt */}
            <div className="w-8 flex-shrink-0" />

            <button
              onClick={() => handleSelectNote(note)}
              className="flex-1 px-4 py-2 text-left flex flex-col justify-between min-w-0"
            >
              {/* Note Header mit Title, Tag und Icons */}
              <div className="flex items-center gap-2 min-w-0">
                {/* Title */}
                <h3 className="text-sm font-semibold text-text-primary truncate flex-shrink min-w-0">
                  {getFirstLine(note.content)}
                </h3>

                {/* Tag - nur der erste, weiter rechts positioniert */}
                {note.tags && note.tags.length > 0 && (
                  <span
                    className="px-1.5 py-px text-xs rounded border whitespace-nowrap flex-shrink-0 max-w-[80px] truncate ml-auto"
                    style={{
                      backgroundColor: `${note.tags[0].color || '#10b981'}20`,
                      color: note.tags[0].color || '#10b981',
                      borderColor: `${note.tags[0].color || '#10b981'}40`
                    }}
                    title={note.tags[0].name}
                  >
                    {note.tags[0].name}
                  </span>
                )}

                {/* Icons */}
                <div className="flex items-center space-x-1 flex-shrink-0">
                  {note.isPinned && <Pin className="w-3 h-3 text-brand-primary" />}
                  {note.isFavorite && <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />}
                  {note.isLocked && <Lock className="w-3 h-3 text-text-secondary" />}
                </div>
              </div>

              {/* Note Preview - nur eine Zeile */}
              <p className="text-xs text-text-secondary truncate min-w-0">
                {getPreview(note.content)}
              </p>

              {/* Folder Info */}
              <div className="flex items-center gap-1 min-w-0">
                <Folder className="w-3 h-3 text-text-secondary flex-shrink-0" />
                <span className="text-xs text-text-secondary truncate">
                  {note.folder?.name || 'Alle Notizen'}
                </span>
              </div>

              {/* Note Meta */}
              <div className="flex items-center justify-between gap-2 min-w-0">
                <span className="text-xs text-text-secondary flex-shrink-0">
                  {formatDistanceToNow(new Date(dateDisplayMode === 'createdAt' ? note.createdAt : note.updatedAt), {
                    addSuffix: true,
                    locale: de,
                  })}
                </span>
              </div>
            </button>
            {currentNote?.id !== note.id && <div className="absolute bottom-0 inset-x-5 h-px glass-divider" />}
          </div>
        ))}
      </div>

      {/* Context Menu */}
      <NoteContextMenu
        isOpen={contextMenu.isOpen}
        position={contextMenu.position}
        onClose={closeContextMenu}
        onEdit={handleEdit}
        onMove={handleMove}
        onPin={handlePin}
        onFavorite={handleFavorite}
        onArchive={handleArchive}
        onTag={handleTag}
        onDelete={handleDelete}
        note={contextMenu.note || { isPinned: false, isFavorite: false, isArchived: false, isDeleted: false }}
      />

      {/* Move to Folder Modal */}
      <MoveToFolderModal
        isOpen={showMoveModal}
        onClose={() => setShowMoveModal(false)}
        onMove={handleMoveToFolder}
        currentFolderId={contextMenu.note?.folderId}
      />

      {/* Tag Selection Modal */}
      <TagSelectionModal
        isOpen={showTagModal}
        onClose={() => setShowTagModal(false)}
        onUpdateTags={handleUpdateTags}
        currentTagIds={contextMenu.note?.tags?.map(t => t.id) || []}
      />
      </>
    );
  }

  // Alle Ansichten: Mit Sortierung und Drag & Drop
  return (
    <>
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Sortierung Header */}
      <div className="px-4 py-2 border-y glass-divider border-l-0 border-r-0 -mt-[1px]" style={{ background: 'var(--color-bg-header)', boxShadow: '0 4px 24px rgba(0,0,0,0.14)' }}>
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-text-primary">Sortierung</span>
          <div className="flex items-center space-x-2 pr-[6px]">
            {/* Custom sort dropdown */}
            <button
              ref={sortTriggerRef}
              onClick={() => {
                const rect = sortTriggerRef.current?.getBoundingClientRect();
                if (rect) setSortDropdownPos({ top: rect.bottom + 4, left: rect.right, width: rect.width });
                setShowSortDropdown(v => !v);
              }}
              className="flex items-center gap-1 px-2 py-1 border glass-divider glass-bg rounded text-sm text-text-primary hover:text-brand-primary transition-colors"
            >
              <span>{sortLabels[sortBy] ?? 'Erstellt'}</span>
              <ChevronDown className={`w-3 h-3 text-text-secondary transition-transform ${showSortDropdown ? 'rotate-180' : ''}`} />
            </button>

            {showSortDropdown && createPortal(
              <div
                className="fixed z-[9999] glass-popup rounded-xl shadow-lg py-1 w-36"
                style={{ top: sortDropdownPos.top, left: sortDropdownPos.left, transform: 'translateX(-100%)' }}
              >
                <div ref={sortDropdownRef} className="relative" onMouseLeave={onSortLeave}>
                  {sortPill && (
                    <div
                      className="glass-pill pointer-events-none"
                      style={{ left: sortPill.left, top: sortPill.top, width: sortPill.width, height: sortPill.height }}
                    />
                  )}
                  {(Object.entries(sortLabels) as [SortOption, string][]).map(([value, label]) => (
                    <button
                      key={value}
                      onMouseEnter={onSortEnter}
                      onClick={() => { updateSorting(value, sortOrder); setShowSortDropdown(false); }}
                      className={clsx(
                        'relative z-10 w-full text-left px-3 py-2 text-sm transition-colors',
                        sortBy === value ? 'text-brand-primary' : 'text-text-primary'
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>,
              document.body
            )}

            <button
              onClick={() => updateSorting(sortBy, sortOrder === 'desc' ? 'asc' : 'desc')}
              className={`p-1 text-text-secondary hover:text-brand-primary transition-colors ${sortBy === 'manual' ? 'invisible' : ''}`}
              title={`Sortierung: ${sortOrder === 'desc' ? 'Absteigend' : 'Aufsteigend'}`}
              tabIndex={sortBy === 'manual' ? -1 : 0}
            >
              {sortOrder === 'desc' ? <ArrowDown className="w-4 h-4" /> : <ArrowUp className="w-4 h-4" />}
            </button>
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
          <div className="flex-1 relative scrollbar-overlay">
          {/* Glass Pill Hover */}
          {hoveredNoteId !== null && (
            <div
              className="glass-pill pointer-events-none transition-all duration-300 ease-[cubic-bezier(0.59,0.04,0.3,1.43)]"
              style={{
                left: hoveredNoteId === currentNote?.id ? 3 : 0,
                top: highlighterStyle.top,
                width: hoveredNoteId === currentNote?.id ? 'calc(100% - 6px)' : '100%',
                height: highlighterStyle.height,
              }}
            />
          )}

          {localNotes.map((note, index) => (
            <SortableNoteItem
              key={note.id}
              note={note}
              isSelected={currentNote?.id === note.id}
              onSelectNote={handleSelectNote}
              getPreview={getPreview}
              getFirstLine={getFirstLine}
              showDragHandle={!isTrash}
              dateDisplayMode={dateDisplayMode}
              onMouseEnter={() => handleMouseEnter(index, note.id)}
              onMouseLeave={handleMouseLeave}
              noteRef={(el) => (noteRefs.current[index] = el)}
              onRightClick={handleNoteRightClick}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
    </div>

    {/* Context Menu */}
    <NoteContextMenu
      isOpen={contextMenu.isOpen}
      position={contextMenu.position}
      onClose={closeContextMenu}
      onEdit={handleEdit}
      onMove={handleMove}
      onPin={handlePin}
      onFavorite={handleFavorite}
      onArchive={handleArchive}
      onTag={handleTag}
      onDelete={handleDelete}
      note={contextMenu.note || { isPinned: false, isFavorite: false, isArchived: false, isDeleted: false }}
    />

    {/* Move to Folder Modal */}
    <MoveToFolderModal
      isOpen={showMoveModal}
      onClose={() => setShowMoveModal(false)}
      onMove={handleMoveToFolder}
      currentFolderId={contextMenu.note?.folderId}
    />

    {/* Tag Selection Modal */}
    <TagSelectionModal
      isOpen={showTagModal}
      onClose={() => setShowTagModal(false)}
      onUpdateTags={handleUpdateTags}
      currentTagIds={contextMenu.note?.tags?.map(t => t.id) || []}
    />
    </>
  );
};

export default NoteList;
