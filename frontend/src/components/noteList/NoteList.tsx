import { startOfDay, startOfWeek } from 'date-fns';
import { Note } from '../../types';
import { Plus, Trash2, Search, SlidersHorizontal, ArrowUp, ArrowDown, ChevronDown } from 'lucide-react';
import clsx from 'clsx';
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { AnimatePresence, motion, Reorder } from 'motion/react';
import { createPortal } from 'react-dom';
import { noteService } from '../../services/note.service';
import { useNoteStore } from '../../store/useNoteStore';
import { useSettingsStore } from '../../store/useSettingsStore';
import { useToast } from '../ui/ToastContainer';
import NoteContextMenu from './NoteContextMenu';
import MoveToFolderModal from '../modals/MoveToFolderModal';
import TagSelectionModal from '../modals/TagSelectionModal';
import { getModalPortalRoot } from '../../lib/modalPortalRoot';
import { useGlassPill } from '../../hooks/useGlassPill';
import ReorderNoteItem, { NoteItemContent } from './NoteItem';
import { getFirstLine } from './noteListUtils';

export type SortOption = 'createdAt' | 'updatedAt' | 'title' | 'pinned' | 'manual';
type ListTab = 'all' | 'today' | 'week';

interface NoteListProps {

  notes: Note[];
  currentNote: Note | null;
  onSelectNote: (note: Note | null) => void;
  onNotesReordered?: () => void;
  contextType: string;
  contextId?: string;
  isTrash?: boolean;
  sortBy: SortOption;
  sortOrder: 'asc' | 'desc';
  onSortChange: (sortBy: SortOption, sortOrder: 'asc' | 'desc') => void;
  onCreateNote?: () => void;
  isCreating?: boolean;
  onEmptyTrash?: () => void;
}


const NoteList = ({ notes, currentNote, onSelectNote, onNotesReordered, contextType, contextId, isTrash, sortBy, sortOrder, onSortChange, onCreateNote, isCreating, onEmptyTrash }: NoteListProps) => {
  const { updateNote, togglePin, toggleFavorite, toggleArchive, toggleTrash, deleteNote, searchNotes } = useNoteStore();
  const { dateDisplayMode } = useSettingsStore();
  const toast = useToast();

  const [localNotes, setLocalNotes] = useState(notes);
  const [hoveredNoteId, setHoveredNoteId] = useState<string | null>(null);
  const [highlighterStyle, setHighlighterStyle] = useState({ top: 0, height: 0 });
  const noteRefs = useRef<Record<string, HTMLElement | null>>({});
  const noteListScrollRef = useRef<HTMLDivElement | null>(null);
  const leaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [contextMenu, setContextMenu] = useState<{
    isOpen: boolean;
    position: { x: number; y: number };
    note: Note | null;
  }>({
    isOpen: false,
    position: { x: 0, y: 0 },
    note: null,
  });

  const [showMoveModal, setShowMoveModal] = useState(false);
  const [showTagModal, setShowTagModal] = useState(false);

  // Search & filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [listTab, setListTab] = useState<ListTab>('all');
  const [filterPanelOpen, setFilterPanelOpen] = useState(false);
  const [sortFieldMenuOpen, setSortFieldMenuOpen] = useState(false);
  const [filterPanelPos, setFilterPanelPos] = useState({ top: 0, left: 0, width: 200 });
  const filterTriggerRef = useRef<HTMLButtonElement>(null);
  const filterPanelRef = useRef<HTMLDivElement>(null);
  const sortFieldDropdownRef = useRef<HTMLDivElement>(null);
  const { pill: sortFieldPill, onEnter: onSortFieldEnter, onLeave: onSortFieldLeave } = useGlassPill(sortFieldDropdownRef);

  const displayNotes = useMemo(() => {
    if (isTrash) return notes;
    const now = new Date();
    const dayStart = startOfDay(now);
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    return notes.filter((n) => {
      const updated = new Date(n.updatedAt);
      if (listTab === 'today') return updated >= dayStart;
      if (listTab === 'week') return updated >= weekStart;
      return true;
    });
  }, [notes, listTab, isTrash]);

  const sortLabels: Partial<Record<SortOption, string>> = {
    createdAt: 'Erstellt',
    updatedAt: 'Aktualisiert',
    title: 'Titel',
    manual: 'Manuell',
  };

  const listTabs: { id: ListTab; label: string }[] = [
    { id: 'all', label: 'Alle' },
    { id: 'today', label: 'Heute' },
    { id: 'week', label: 'Diese Woche' },
  ];

  const localNotesRef = useRef(localNotes);
  useEffect(() => { localNotesRef.current = localNotes; }, [localNotes]);
  const isDraggingRef = useRef(false);

  useEffect(() => {
    setLocalNotes(displayNotes);
  }, [displayNotes]);

  useEffect(() => {
    if (!filterPanelOpen) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (filterPanelRef.current?.contains(t) || filterTriggerRef.current?.contains(t)) return;
      setFilterPanelOpen(false);
      setSortFieldMenuOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [filterPanelOpen]);

  useEffect(() => {
    if (!sortFieldMenuOpen) onSortFieldLeave();
  }, [sortFieldMenuOpen, onSortFieldLeave]);

  useEffect(() => {
    return () => { if (leaveTimerRef.current) clearTimeout(leaveTimerRef.current); };
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      await searchNotes(searchQuery);
    } else {
      onNotesReordered?.();
    }
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    if (!value.trim()) {
      onNotesReordered?.();
    }
  };

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
      const isCurrentNote = currentNote?.id === contextMenu.note.id;
      if (contextMenu.note.isDeleted) {
        try {
          await deleteNote(contextMenu.note.id);
          toast.success('Notiz endgültig gelöscht');
          if (isCurrentNote) onSelectNote(null);
          if (onNotesReordered) onNotesReordered();
        } catch (error) {
          toast.error('Fehler beim Löschen');
        }
      } else {
        try {
          await toggleTrash(contextMenu.note.id);
          toast.success('Notiz gelöscht');
          if (isCurrentNote) onSelectNote(null);
          if (onNotesReordered) onNotesReordered();
        } catch (error) {
          toast.error('Fehler beim Löschen der Notiz');
        }
      }
    }
  };

  useEffect(() => {
    if (sortBy === 'manual') return;
    const sortedNotes = [...displayNotes].sort((a, b) => {
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
          const aTitleText = a.title || getFirstLine(a.content);
          const bTitleText = b.title || getFirstLine(b.content);
          comparison = aTitleText.localeCompare(bTitleText);
          break;
        case 'pinned':
          comparison = a.isPinned === b.isPinned ? 0 : a.isPinned ? -1 : 1;
          break;
      }
      return sortOrder === 'desc' ? -comparison : comparison;
    });
    setLocalNotes(sortedNotes);
  }, [displayNotes, sortBy, sortOrder]);

  const measureRowInScroll = useCallback((noteId: string) => {
    const rowEl = noteRefs.current[noteId];
    if (!rowEl) return null;
    return { top: rowEl.offsetTop, height: rowEl.offsetHeight };
  }, []);

  useEffect(() => {
    if (hoveredNoteId === null) return;
    if (!localNotes.find(n => n.id === hoveredNoteId)) {
      setHoveredNoteId(null);
      return;
    }
    const m = measureRowInScroll(hoveredNoteId);
    if (m) setHighlighterStyle(m);
  }, [localNotes, hoveredNoteId, measureRowInScroll]);

  useEffect(() => {
    const scrollEl = noteListScrollRef.current;
    if (!scrollEl || hoveredNoteId === null) return;
    const onScroll = () => {
      const m = measureRowInScroll(hoveredNoteId);
      if (m) setHighlighterStyle(m);
    };
    scrollEl.addEventListener('scroll', onScroll, { passive: true });
    return () => scrollEl.removeEventListener('scroll', onScroll);
  }, [hoveredNoteId, measureRowInScroll]);

  const handleMouseEnter = (noteId: string) => {
    if (isDraggingRef.current) return;
    if (leaveTimerRef.current) {
      clearTimeout(leaveTimerRef.current);
      leaveTimerRef.current = null;
    }
    setHoveredNoteId(noteId);
    const m = measureRowInScroll(noteId);
    if (m) setHighlighterStyle(m);
  };

  const handleMouseLeave = () => {
    leaveTimerRef.current = setTimeout(() => {
      setHoveredNoteId(null);
    }, 80);
  };

  const handleSelectNote = (note: Note | null) => {
    onSelectNote(note);
  };

  const handleReorderDragStart = useCallback(() => {
    isDraggingRef.current = true;
    setHoveredNoteId(null);
  }, []);

  const handleReorderDragEnd = useCallback(async () => {
    setTimeout(() => { isDraggingRef.current = false; }, 350);
    onSortChange('manual', sortOrder);
    const noteOrders = localNotesRef.current.map((note, index) => ({ id: note.id, order: index }));
    try {
      await noteService.reorderNotes(noteOrders, contextType, contextId || null);
      onNotesReordered?.();
    } catch {
      setLocalNotes(displayNotes);
    }
  }, [sortOrder, contextType, contextId, onNotesReordered, onSortChange, displayNotes]);

  const header = (
    <div className="space-y-3 border-b border-divider p-3 pb-3">
      <form onSubmit={handleSearch} className="relative">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => handleSearchChange(e.target.value)}
          placeholder="Notizen durchsuchen..."
          className="input input-inset w-full pl-10 pr-10 py-2.5 rounded-xl text-sm border border-[color-mix(in_srgb,var(--color-border-default)_50%,transparent)]"
        />
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary pointer-events-none" />
        <div className="absolute right-2 top-0 bottom-0 flex items-center">
          <button
            ref={filterTriggerRef}
            type="button"
            onClick={() => {
              if (filterPanelOpen) {
                setFilterPanelOpen(false);
                setSortFieldMenuOpen(false);
                return;
              }
              const el = filterTriggerRef.current;
              if (el) {
                const rect = el.getBoundingClientRect();
                const w = 200;
                const left = Math.max(8, Math.min(rect.right - w, window.innerWidth - w - 8));
                setFilterPanelPos({ top: rect.bottom + 6, left, width: w });
              }
              setFilterPanelOpen(true);
            }}
            className={clsx(
              'p-1.5 rounded-lg transition-colors duration-300',
              filterPanelOpen &&
                'text-brand-primary bg-[color-mix(in_srgb,var(--color-bg-elevated)_40%,transparent)]'
            )}
            title="Filter & Sortierung"
            aria-label="Filter und Sortierung"
            aria-expanded={filterPanelOpen}
            aria-haspopup="dialog"
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>
        </div>
      </form>
      {!isTrash && (
        <div className="flex flex-wrap gap-1.5">
          {listTabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setListTab(t.id)}
              className={clsx(
                'relative group px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-300',
                listTab === t.id
                  ? 'text-text-primary bg-[color-mix(in_srgb,var(--color-brand-primary)_15%,transparent)]'
                  : 'hover:bg-[color-mix(in_srgb,var(--color-text-primary)_6%,transparent)]'
              )}
            >
              {t.label}
              <span className={clsx(
                'absolute bottom-0 left-3 right-3 h-[2px] transition-colors duration-300',
                listTab === t.id
                  ? 'bg-brand-primary'
                  : 'bg-transparent group-hover:bg-[color-mix(in_srgb,var(--color-brand-primary)_55%,transparent)]'
              )} />
            </button>
          ))}
        </div>
      )}
    </div>
  );

  const filterPanel = filterPanelOpen
    ? createPortal(
        <div
          ref={filterPanelRef}
          role="dialog"
          aria-label="Sortierung"
          className="fixed glass-popup rounded-xl border border-[color-mix(in_srgb,var(--color-border-default)_50%,transparent)] shadow-lg py-3 px-3 mt-1 ml-2"
          style={{
            top: filterPanelPos.top,
            left: filterPanelPos.left,
            width: filterPanelPos.width,
          }}
        >
          <p className="text-sm ml-1 font-medium text-text-secondary tracking-wide mb-2">Sortierung</p>
          <div className="flex items-center gap-2">
            <div className="relative min-w-0 flex-1">
              <button
                type="button"
                onClick={() => setSortFieldMenuOpen((v) => !v)}
                className="flex w-full items-center justify-between gap-1 rounded-full border border-[color-mix(in_srgb,var(--color-border-default)_50%,transparent)] bg-[color-mix(in_srgb,var(--color-bg-elevated)_35%,transparent)] px-2.5 py-1.5 text-left text-sm text-text-primary transition-all duration-300 hover:text-brand-primary"
              >
                <span className="truncate">{sortLabels[sortBy] ?? 'Erstellt'}</span>
                <ChevronDown
                  className={clsx(
                    'h-3 w-3 shrink-0 text-text-secondary transition-transform',
                    sortFieldMenuOpen && 'rotate-180'
                  )}
                />
              </button>
              {sortFieldMenuOpen && (
                <div className="absolute left-0 right-0 top-full z-10 mt-1 overflow-hidden rounded-xl glass-popup py-1" style={{ background: 'color-mix(in srgb, var(--color-bg-primary-surface) 85%, transparent)' }}>
                  <div
                    ref={sortFieldDropdownRef}
                    className="relative"
                    onMouseLeave={onSortFieldLeave}
                  >
                    {sortFieldPill && (
                      <div
                        className="glass-pill pointer-events-none"
                        style={{
                          left: sortFieldPill.left,
                          top: sortFieldPill.top,
                          width: sortFieldPill.width,
                          height: sortFieldPill.height,
                          opacity: sortFieldPill.visible ? 1 : 0,
                        }}
                      />
                    )}
                    {(Object.entries(sortLabels) as [SortOption, string][]).map(([value, label]) => (
                      <button
                        key={value}
                        type="button"
                        onMouseEnter={onSortFieldEnter}
                        onClick={() => {
                          onSortChange(value, sortOrder);
                          setSortFieldMenuOpen(false);
                        }}
                        className={clsx(
                          'relative z-10 w-full px-3 py-2 text-left text-sm transition-colors',
                          sortBy === value ? 'text-brand-primary' : 'text-text-primary'
                        )}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => onSortChange(sortBy, sortOrder === 'desc' ? 'asc' : 'desc')}
              className={clsx(
                'shrink-0 rounded-lg p-1.5 transition-colors hover:text-brand-primary',
                sortBy === 'manual' && 'invisible pointer-events-none'
              )}
              title={sortOrder === 'desc' ? 'Absteigend' : 'Aufsteigend'}
              tabIndex={sortBy === 'manual' ? -1 : 0}
            >
              {sortOrder === 'desc' ? <ArrowDown className="h-4 w-4" /> : <ArrowUp className="h-4 w-4" />}
            </button>
          </div>
        </div>,
        getModalPortalRoot()
      )
    : null;

  const sharedModals = (
    <>
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
      <MoveToFolderModal
        isOpen={showMoveModal}
        onClose={() => setShowMoveModal(false)}
        onMove={handleMoveToFolder}
        currentFolderId={contextMenu.note?.folderId}
      />
      <TagSelectionModal
        isOpen={showTagModal}
        onClose={() => setShowTagModal(false)}
        onUpdateTags={handleUpdateTags}
        currentTagIds={contextMenu.note?.tags?.map(t => t.id) || []}
      />
      {filterPanel}
    </>
  );

  if (displayNotes.length === 0) {
    return (
      <>
        {header}
        <div className="flex-1 flex items-center justify-center p-8 text-center select-none">
          <div className="space-y-2">
            <p className="text-sm font-medium text-text-secondary">Keine Notizen</p>
            <p className="text-xs text-text-muted">{isTrash ? 'Papierkorb ist leer' : 'Erstelle eine neue Notiz'}</p>
          </div>
        </div>
        {onCreateNote && (
          <div className="flex-shrink-0">
            <div className="border-t border-divider" />
            <div className="flex h-16 items-center justify-center px-4">
              <button
                type="button"
                onClick={onCreateNote}
                disabled={isCreating}
                className="w-full py-2 rounded-full text-sm font-medium text-text-primary transition-all duration-300 disabled:opacity-50 border border-[color-mix(in_srgb,var(--color-brand-primary)_35%,transparent)] bg-[color-mix(in_srgb,var(--color-brand-primary)_14%,transparent)] hover:bg-[color-mix(in_srgb,var(--color-brand-primary)_22%,transparent)] hover:shadow-[0_0_24px_color-mix(in_srgb,var(--color-brand-primary)_15%,transparent)]"
              >
                <span className="inline-flex items-center justify-center gap-2">
                  <Plus className="w-4 h-4" />
                  Neue Notiz
                </span>
              </button>
            </div>
          </div>
        )}
        {isTrash && onEmptyTrash && (
          <div className="flex-shrink-0">
            <div className="border-t border-divider" />
            <div className="flex h-16 items-center justify-center px-4">
              <button
                type="button"
                onClick={onEmptyTrash}
                className="w-full py-2 rounded-full text-sm font-medium text-text-secondary transition-all duration-300 border border-[color-mix(in_srgb,#ef4444_25%,transparent)] bg-[color-mix(in_srgb,#ef4444_8%,transparent)] hover:bg-[color-mix(in_srgb,#ef4444_14%,transparent)] hover:text-red-400 hover:shadow-[0_0_24px_color-mix(in_srgb,#ef4444_10%,transparent)]"
              >
                <span className="inline-flex items-center justify-center gap-2">
                  <Trash2 className="w-4 h-4" />
                  Papierkorb leeren
                </span>
              </button>
            </div>
          </div>
        )}
        {sharedModals}
      </>
    );
  }

  if (isTrash) {
    return (
      <>
        {header}
        <div
          ref={noteListScrollRef}
          className="flex-1 relative scrollbar-overlay flex min-h-0 flex-col overflow-y-auto"
        >
          <AnimatePresence initial={false}>
          {localNotes.map((note, index) => {
            const isLast = index === localNotes.length - 1;
            return (
              <motion.div
                key={note.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                <div
                  ref={(el) => (noteRefs.current[note.id] = el)}
                  onMouseEnter={() => handleMouseEnter(note.id)}
                  onMouseLeave={handleMouseLeave}
                  onContextMenu={(e) => handleNoteRightClick(e, note)}
                  className={clsx(
                    'flex w-full relative z-[1] min-h-[108px]',
                    !isLast &&
                      "after:pointer-events-none after:absolute after:bottom-0 after:left-6 after:right-6 after:z-0 after:content-[''] after:border-b after:border-divider",
                    currentNote?.id === note.id ? 'note-item-selected' : ''
                  )}
                >
                  <NoteItemContent
                    note={note}
                    isSelected={currentNote?.id === note.id}
                    showDragHandle={false}
                    dateDisplayMode={dateDisplayMode}
                    onSelectNote={handleSelectNote}
                  />
                </div>
              </motion.div>
            );
          })}
          </AnimatePresence>
          <div
            className="glass-pill pointer-events-none transition-all duration-300 ease-[cubic-bezier(0.33,1,0.68,1)] !rounded-none"
            style={{ left: 0, top: highlighterStyle.top, width: '100%', height: highlighterStyle.height, opacity: hoveredNoteId !== null ? 1 : 0, boxShadow: 'none' }}
          />
        </div>
        {onEmptyTrash && (
          <div className="flex-shrink-0">
            <div className="border-t border-divider" />
            <div className="flex h-16 items-center justify-center px-4">
              <button
                type="button"
                onClick={onEmptyTrash}
                className="w-full py-2 rounded-full text-sm font-medium text-text-secondary transition-all duration-300 border border-[color-mix(in_srgb,#ef4444_25%,transparent)] bg-[color-mix(in_srgb,#ef4444_8%,transparent)] hover:bg-[color-mix(in_srgb,#ef4444_14%,transparent)] hover:text-red-400 hover:shadow-[0_0_24px_color-mix(in_srgb,#ef4444_10%,transparent)]"
              >
                <span className="inline-flex items-center justify-center gap-2">
                  <Trash2 className="w-4 h-4" />
                  Papierkorb leeren
                </span>
              </button>
            </div>
          </div>
        )}
        {sharedModals}
      </>
    );
  }

  return (
    <>
      {header}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex min-h-0 flex-1 flex-col">
          <div
            ref={noteListScrollRef}
            className="flex-1 relative scrollbar-overlay flex min-h-0 flex-col overflow-y-auto"
          >
          <Reorder.Group
            axis="y"
            values={localNotes}
            onReorder={setLocalNotes}
            className="flex-1 flex flex-col list-none"
            style={{ padding: 0, margin: 0 }}
          >
            <AnimatePresence initial={false}>
            {localNotes.map((note, index) => (
              <ReorderNoteItem
                key={note.id}
                note={note}
                isSelected={currentNote?.id === note.id}
                isLast={index === localNotes.length - 1}
                onSelectNote={handleSelectNote}
                showDragHandle={!isTrash}
                dateDisplayMode={dateDisplayMode}
                onMouseEnter={() => handleMouseEnter(note.id)}
                onMouseLeave={handleMouseLeave}
                noteRef={(el: HTMLElement | null) => (noteRefs.current[note.id] = el)}
                onRightClick={handleNoteRightClick}
                onDragStart={handleReorderDragStart}
                onDragEnd={handleReorderDragEnd}
              />
            ))}
            </AnimatePresence>
          </Reorder.Group>
          <div
            className="glass-pill pointer-events-none transition-all duration-300 ease-[cubic-bezier(0.33,1,0.68,1)] !rounded-none"
            style={{ left: 0, top: highlighterStyle.top, width: '100%', height: highlighterStyle.height, opacity: hoveredNoteId !== null ? 1 : 0, boxShadow: 'none' }}
          />
          </div>
        </div>
      </div>
      {onCreateNote && (
        <div className="flex-shrink-0">
          <div className="border-t border-divider" />
          <div className="flex h-16 items-center justify-center px-4">
            <button
              type="button"
              onClick={onCreateNote}
              disabled={isCreating}
              className="w-full py-2 rounded-full text-sm font-medium text-text-primary transition-all duration-300 disabled:opacity-50 border border-[color-mix(in_srgb,var(--color-brand-primary)_35%,transparent)] bg-[color-mix(in_srgb,var(--color-brand-primary)_14%,transparent)] hover:bg-[color-mix(in_srgb,var(--color-brand-primary)_22%,transparent)] hover:shadow-[0_0_24px_color-mix(in_srgb,var(--color-brand-primary)_15%,transparent)]"
            >
              <span className="inline-flex items-center justify-center gap-2">
                <Plus className="w-4 h-4" />
                Neue Notiz
              </span>
            </button>
          </div>
        </div>
      )}
      {sharedModals}
    </>
  );
};

export default NoteList;
