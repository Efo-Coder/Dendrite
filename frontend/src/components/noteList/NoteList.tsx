import { startOfDay, startOfWeek, startOfMonth } from 'date-fns';
import { useMagicHover } from '../../hooks/useMagicHover';
import { Note } from '../../types';
import { Plus, Trash2, Search, SlidersHorizontal, ArrowUp, ArrowDown } from 'lucide-react';
import clsx from 'clsx';
import { useState, useEffect, useLayoutEffect, useRef, useCallback, useMemo, Fragment } from 'react';
import { AnimatePresence, motion, Reorder, MotionConfig, useMotionValue, useMotionTemplate } from 'motion/react';
import { createPortal } from 'react-dom';
import { noteService } from '../../services/note.service';
import { useNoteStore } from '../../store/useNoteStore';
import { useSettingsStore } from '../../store/useSettingsStore';
import { useToast } from '../ui/ToastContainer';
import { useSmartPopupStyle } from '../../hooks/useSmartPopupStyle';
import type { PopupAnchor } from '../../hooks/useSmartPopupStyle';
import { getModalPortalRoot } from '../../lib/modalPortalRoot';
import NoteContextMenu from './NoteContextMenu';
import MoveToFolderModal from '../modals/MoveToFolderModal';
import TagSelectionModal from '../modals/TagSelectionModal';
import ReorderNoteItem, { NoteItemContent } from './NoteItem';
import { getFirstLine } from './noteListUtils';

// ── Types ─────────────────────────────────────────────────────────────────────

export type SortOption = 'createdAt' | 'updatedAt' | 'title' | 'pinned' | 'manual';
type ListTab = 'all' | 'today' | 'week' | 'month';

interface NoteListProps {
  notes: Note[];
  currentNote: Note | null;
  onSelectNote: (note: Note | null) => void;
  onNotesReordered?: () => void;
  viewLabel?: string;
  contextType: string;
  contextId?: string;
  isTrash?: boolean;
  sortBy: SortOption;
  sortOrder: 'asc' | 'desc';
  onSortChange: (sortBy: SortOption, sortOrder: 'asc' | 'desc') => void;
  onCreateNote?: () => void;
  isCreating?: boolean;
  onEmptyTrash?: () => void;
  focusSearchTrigger?: number;
}

// ── Component ─────────────────────────────────────────────────────────────────

const NoteList = ({
  notes, currentNote, onSelectNote, onNotesReordered,
  viewLabel, contextType, contextId, isTrash,
  sortBy, sortOrder, onSortChange,
  onCreateNote, isCreating, onEmptyTrash, focusSearchTrigger,
}: NoteListProps) => {

  // ── Hooks ──────────────────────────────────────────────────────────────────

  const { updateNote, togglePin, toggleFavorite, toggleArchive, toggleTrash, deleteNote, searchNotes, noteCounts } = useNoteStore();
  const { dateDisplayMode } = useSettingsStore();
  const toast = useToast();

  // ── State ──────────────────────────────────────────────────────────────────

  const { containerRef: noteListRef, onItemEnter: onCardEnter, onItemLeave: onCardLeave, Indicator: NoteIndicator } = useMagicHover({ mode: 'free', background: 'var(--surface)', borderRadius: 9 });

  // Only non-null while the user is actively drag-reordering
  const [dragNotes, setDragNotes] = useState<Note[] | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const waitingToClearDragRef = useRef(false);

  useEffect(() => {
    if (waitingToClearDragRef.current) {
      waitingToClearDragRef.current = false;
      setDragNotes(null);
    }
  }, [notes]);

  const [contextMenu, setContextMenu] = useState<{
    isOpen: boolean;
    position: { x: number; y: number };
    note: Note | null;
  }>({ isOpen: false, position: { x: 0, y: 0 }, note: null });

  const [showMoveModal, setShowMoveModal] = useState(false);
  const [showTagModal, setShowTagModal] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [listTab, setListTab] = useState<ListTab>('all');
  const [hoveredTab, setHoveredTab] = useState<ListTab | null>(null);
  const [sortFieldMenuOpen, setSortFieldMenuOpen] = useState(false);
  const [sortMenuAnchor, setSortMenuAnchor] = useState<PopupAnchor | null>(null);
  const [searchHovered, setSearchHovered] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const searchMouseX = useMotionValue(0);
  const searchMouseY = useMotionValue(0);
  const searchGradient = useMotionTemplate`radial-gradient(120px circle at ${searchMouseX}px ${searchMouseY}px, var(--accent), transparent 80%)`;
  const searchGlowActive = searchHovered && !searchFocused;

  // ── Refs ───────────────────────────────────────────────────────────────────

  // Stable reference for use inside async callbacks (handleReorderDragEnd)
  const localNotesRef = useRef<Note[]>([]);
  const listSearchRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const sortPopupRef = useRef<HTMLDivElement | null>(null);

  const { style: sortPopupStyle } = useSmartPopupStyle(sortMenuAnchor, sortPopupRef, 0);

  // ── Derived values ─────────────────────────────────────────────────────────

  // Filter notes by the selected time-range tab.
  const displayNotes = useMemo(() => {
    if (isTrash) {
      return notes.filter(n => n.isDeleted);
    }
    const now = new Date();
    const dayStart = startOfDay(now);
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const monthStart = startOfMonth(now);
    return notes.filter((n) => {
      const updated = new Date(n.updatedAt);
      if (listTab === 'today') return updated >= dayStart;
      if (listTab === 'week')  return updated >= weekStart;
      if (listTab === 'month') return updated >= monthStart;
      return true;
    });
  }, [notes, listTab, isTrash]);

  // Sorted/reordered notes — computed synchronously so renders never see stale data.
  // During drag, dragNotes holds the live reorder snapshot; otherwise derived from displayNotes.
  const localNotes = useMemo(() => {
    if (dragNotes) return dragNotes;
    if (sortBy === 'manual') return displayNotes;
    return [...displayNotes].sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      let cmp = 0;
      switch (sortBy) {
        case 'createdAt': cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(); break;
        case 'updatedAt': cmp = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime(); break;
        case 'title': {
          const aT = a.title || getFirstLine(a.content);
          const bT = b.title || getFirstLine(b.content);
          cmp = aT.localeCompare(bT);
          break;
        }
        case 'pinned': cmp = a.isPinned === b.isPinned ? 0 : a.isPinned ? -1 : 1; break;
      }
      return sortOrder === 'desc' ? -cmp : cmp;
    });
  }, [dragNotes, displayNotes, sortBy, sortOrder]);

  // Group into pinned + month buckets for the reorder view
  const groups = useMemo(() => {
    const pinned = localNotes.filter(n => n.isPinned);
    const rest   = localNotes.filter(n => !n.isPinned);
    const monthMap = new Map<string, Note[]>();
    rest.forEach(n => {
      const key = new Date(n.updatedAt).toLocaleDateString(undefined, { month: 'short', year: 'numeric' }).toUpperCase();
      if (!monthMap.has(key)) monthMap.set(key, []);
      monthMap.get(key)!.push(n);
    });
    const result: { label: string; items: Note[] }[] = [];
    if (pinned.length) result.push({ label: 'PINNED', items: pinned });
    monthMap.forEach((items, label) => result.push({ label, items }));
    return result;
  }, [localNotes]);

  // Count shown in the header — uses pre-computed store totals for global views
  const displayCount =
    contextType === 'all'       ? noteCounts.all :
    contextType === 'favorites' ? noteCounts.favorites :
    contextType === 'archive'   ? noteCounts.archive :
    contextType === 'trash'     ? noteCounts.trash :
    localNotes.length;

  const sortLabels: Partial<Record<SortOption, string>> = {
    createdAt: 'Created',
    updatedAt: 'Updated',
    title: 'Title',
    manual: 'Manual',
  };

  const listTabs: { id: ListTab; label: string }[] = [
    { id: 'all',   label: 'All' },
    { id: 'today', label: 'Today' },
    { id: 'week',  label: 'This Week' },
    { id: 'month', label: 'This Month' },
  ];

  // ── Effects ────────────────────────────────────────────────────────────────

  // Keep ref in sync for use inside async callbacks
  useEffect(() => { localNotesRef.current = localNotes; }, [localNotes]);

  // Reset drag state synchronously before paint when context changes — prevents
  // stale drag notes from a previous category briefly appearing in the new view
  useLayoutEffect(() => {
    setDragNotes(null);
    setIsDragging(false);
  }, [contextType, contextId]);

  // Close sort popup on outside click
  useEffect(() => {
    if (!sortFieldMenuOpen) return;
    const onDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (listSearchRef.current?.contains(target)) return;
      if (sortPopupRef.current?.contains(target)) return;
      setSortFieldMenuOpen(false);
      setSortMenuAnchor(null);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [sortFieldMenuOpen]);

  // Focus search input when triggered externally (e.g. keyboard shortcut)
  useEffect(() => {
    if (focusSearchTrigger) searchInputRef.current?.focus();
  }, [focusSearchTrigger]);

  // ── Search & sort handlers ─────────────────────────────────────────────────

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
    if (!value.trim()) onNotesReordered?.();
  };

  const handleSortToggle = () => {
    if (sortFieldMenuOpen) {
      setSortFieldMenuOpen(false);
      setSortMenuAnchor(null);
      return;
    }
    if (listSearchRef.current) {
      const rect = listSearchRef.current.getBoundingClientRect();
      setSortMenuAnchor({ x: rect.left + rect.width / 2, top: rect.top, bottom: rect.bottom, left: rect.left, width: rect.width });
    }
    setSortFieldMenuOpen(true);
  };

  // ── Context menu handlers ──────────────────────────────────────────────────

  const handleNoteRightClick = (e: React.MouseEvent, note: Note) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ isOpen: true, position: { x: e.clientX, y: e.clientY }, note });
  };

  const closeContextMenu = () => {
    setContextMenu(prev => ({ ...prev, isOpen: false, position: { x: 0, y: 0 } }));
  };

  const handleEdit = () => {
    if (contextMenu.note) onSelectNote(contextMenu.note);
  };

  const handleMove = () => setShowMoveModal(true);
  const handleTag  = () => setShowTagModal(true);

  // ── Note action handlers ───────────────────────────────────────────────────

  const handleMoveToFolder = async (folderId: string | null) => {
    if (!contextMenu.note) return;
    try {
      await updateNote(contextMenu.note.id, { folderId });
      toast.success('Note moved');
      onNotesReordered?.();
    } catch { toast.error('Error moving note'); }
  };

  const handlePin = async () => {
    if (!contextMenu.note) return;
    try {
      await togglePin(contextMenu.note.id);
      toast.success(contextMenu.note.isPinned ? 'Unpinned' : 'Note pinned');
      onNotesReordered?.();
    } catch { toast.error('Error pinning note'); }
  };

  const handleFavorite = async () => {
    if (!contextMenu.note) return;
    try {
      await toggleFavorite(contextMenu.note.id);
      toast.success(contextMenu.note.isFavorite ? 'Removed from favorites' : 'Added to favorites');
      onNotesReordered?.();
    } catch { toast.error('Error updating favorites'); }
  };

  const handleArchive = async () => {
    if (!contextMenu.note) return;
    try {
      await toggleArchive(contextMenu.note.id);
      toast.success(contextMenu.note.isArchived ? 'Unarchived' : 'Note archived');
      onNotesReordered?.();
    } catch { toast.error('Error archiving note'); }
  };

  const handleUpdateTags = async (tagIds: string[]) => {
    if (!contextMenu.note) return;
    try {
      await updateNote(contextMenu.note.id, { tags: tagIds });
      toast.success('Tags updated');
      onNotesReordered?.();
    } catch { toast.error('Error updating tags'); }
  };

  const handleDelete = async () => {
    if (!contextMenu.note) return;
    const isCurrentNote = currentNote?.id === contextMenu.note.id;
    try {
      if (contextMenu.note.isDeleted) {
        await deleteNote(contextMenu.note.id);
        toast.success('Note permanently deleted');
      } else {
        await toggleTrash(contextMenu.note.id);
        toast.success('Note deleted');
      }
      if (isCurrentNote) onSelectNote(null);
      onNotesReordered?.();
    } catch { toast.error('Error deleting note'); }
  };

  const handleRestore = async () => {
    if (!contextMenu.note) return;
    try {
      await toggleTrash(contextMenu.note.id);
      toast.success('Note restored');
      onNotesReordered?.();
    } catch { toast.error('Error restoring note'); }
  };

  // ── Drag / reorder handlers ────────────────────────────────────────────────

  // Merges a reordered group back into the flat note list
  const handleGroupReorder = useCallback((reorderedItems: Note[]) => {
    setDragNotes(prev => {
      const base = prev ?? localNotesRef.current;
      const result: Note[] = [];
      let inserted = false;
      for (const n of base) {
        if (reorderedItems.some(ri => ri.id === n.id)) {
          if (!inserted) { result.push(...reorderedItems); inserted = true; }
        } else {
          result.push(n);
        }
      }
      return result;
    });
  }, []);

  const handleReorderDragStart = useCallback(() => {
    setIsDragging(true);
  }, []);

  const handleReorderDragEnd = useCallback(async () => {
    setTimeout(() => setIsDragging(false), 250);
    onSortChange('manual', sortOrder);
    const noteOrders = localNotesRef.current.map((note, index) => ({ id: note.id, order: index }));
    try {
      await noteService.reorderNotes(noteOrders, contextType, contextId || null);
      if (onNotesReordered) {
        waitingToClearDragRef.current = true;
        onNotesReordered();
      } else {
        setDragNotes(null);
      }
    } catch {
      setDragNotes(null);
    }
  }, [sortOrder, contextType, contextId, onNotesReordered, onSortChange]);

  // ── JSX fragments ──────────────────────────────────────────────────────────

  const header = (
    <div className="notelist-head">
      <div className="notelist-head-row">
        <div className="notelist-title">{viewLabel || 'All Notes'}</div>
        <span className="notelist-count">{displayCount} {displayCount === 1 ? 'note' : 'notes'}</span>
      </div>
      <div
        style={{ position: 'relative', borderRadius: sortFieldMenuOpen ? '9px 9px 0 0' : '9px' }}
        onMouseMove={({ currentTarget, clientX, clientY }) => { const { left, top } = currentTarget.getBoundingClientRect(); searchMouseX.set(clientX - left); searchMouseY.set(clientY - top); }}
        onMouseEnter={() => setSearchHovered(true)}
        onMouseLeave={() => setSearchHovered(false)}
        onFocusCapture={() => setSearchFocused(true)}
        onBlurCapture={() => setSearchFocused(false)}
        className="p-px"
      >
        <motion.div
          animate={{ opacity: searchGlowActive ? 1 : 0 }}
          transition={{ duration: searchGlowActive ? 0.25 : 0.55, ease: "easeOut" }}
          style={{ position: 'absolute', inset: 0, background: searchGradient, borderRadius: 'inherit', pointerEvents: 'none' }}
        />
      <div
        ref={listSearchRef}
        className="notelist-search"
        style={sortFieldMenuOpen ? { borderBottomLeftRadius: 0, borderBottomRightRadius: 0 } : undefined}
      >
        <Search className="search-icon w-3.5 h-3.5" />
        <form onSubmit={handleSearch} style={{ flex: 1, minWidth: 0 }}>
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search notes…"
          />
        </form>
        {sortBy !== 'manual' && (
          <button
            type="button"
            onClick={() => onSortChange(sortBy, sortOrder === 'desc' ? 'asc' : 'desc')}
            style={{ padding: '4px', flexShrink: 0 }}
            title={sortOrder === 'desc' ? 'Descending' : 'Ascending'}
          >
            {sortOrder === 'desc' ? <ArrowDown className="h-3.5 w-3.5" /> : <ArrowUp className="h-3.5 w-3.5" />}
          </button>
        )}
        <button
          type="button"
          onClick={handleSortToggle}
          style={{ padding: '4px', flexShrink: 0, color: sortFieldMenuOpen ? 'var(--accent)' : undefined }}
          title="Sort"
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
        </button>
      </div>
      </div>
      {!isTrash && (
        <div style={{ display: 'flex', gap: '4px', marginTop: '10px' }}>
          {listTabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setListTab(t.id)}
              onMouseEnter={() => setHoveredTab(t.id)}
              onMouseLeave={() => setHoveredTab(null)}
              className={clsx('transition-colors', listTab === t.id ? 'text-(--accent)' : 'text-(--ink-low) hover:text-(--ink)')}
              style={{
                fontFamily: 'var(--mono)',
                fontSize: '9px',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                padding: '3px 10px',
                borderRadius: '20px',
                border: listTab === t.id
                  ? '0.5px solid color-mix(in oklch, var(--accent) 40%, transparent)'
                  : hoveredTab === t.id
                  ? '0.5px solid var(--ink)'
                  : '0.5px solid var(--line-soft)',
                background: listTab === t.id ? 'color-mix(in oklch, var(--accent) 12%, transparent)' : 'transparent',
                cursor: 'pointer',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );

  const sortPortal = createPortal(
    <AnimatePresence>
      {sortFieldMenuOpen && sortMenuAnchor && (
        <motion.div
          key="sort-popup"
          ref={sortPopupRef}
          className="fixed overflow-hidden z-40 border border-(--line) border-t-0"
          style={{
            ...sortPopupStyle,
            background: 'transparent',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            borderRadius: '0 0 8px 8px',
            clipPath: 'inset(0 round 0 0 8px 8px)',
            transformOrigin: 'center top',
          }}
          initial={{ opacity: 0, scaleY: 0.96, y: -4 }}
          animate={{ opacity: 1, scaleY: 1, y: 0 }}
          exit={{ opacity: 0, scaleY: 0.96, y: -4, transition: { duration: 0.1 } }}
          transition={{ duration: 0.15, ease: [0.23, 1, 0.32, 1] as [number, number, number, number] }}
        >
          <div className="pt-2 pb-4">
            {(Object.entries(sortLabels) as [SortOption, string][]).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => { onSortChange(value, sortOrder); setSortFieldMenuOpen(false); setSortMenuAnchor(null); }}
                className={clsx('w-full px-3 py-2 text-left text-sm transition-colors hover:bg-(--surface-hi)', sortBy === value ? 'text-(--accent)' : '')}
              >
                {label}
              </button>
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    getModalPortalRoot()
  );

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
        onRestore={handleRestore}
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
    </>
  );

  const emptyTrashFooter = onEmptyTrash ? (
    <div className="notelist-footer">
      <button type="button" onClick={onEmptyTrash} className="notelist-trash-btn">
        <Trash2 style={{ width: 13, height: 13, flexShrink: 0 }} />
        Empty Trash
      </button>
    </div>
  ) : null;

  // ── Render ─────────────────────────────────────────────────────────────────

  if (displayNotes.length === 0) {
    return (
      <>
        {header}
        <div className="notelist-empty">
          <span className="mark">❧</span>
          <p>{isTrash ? 'Trash is empty' : 'No notes'}</p>
        </div>
        {onCreateNote && (
          <div className="notelist-footer">
            <button type="button" onClick={onCreateNote} disabled={isCreating} className="notelist-new-btn">
              <Plus style={{ width: 14, height: 14, flexShrink: 0 }} />
              {isCreating ? 'Creating…' : 'New Note'}
            </button>
          </div>
        )}
        {isTrash && onEmptyTrash && emptyTrashFooter}
        {sharedModals}
        {sortPortal}
      </>
    );
  }

  if (isTrash) {
    return (
      <>
        {header}
        <MotionConfig transition={isDragging ? { layout: { duration: 0.2 } } : { layout: { duration: 0 } }}>
          <div key={contextType + (contextId ?? '')} ref={noteListRef} className="notelist-scroll" style={{ position: 'relative' }}>
            {NoteIndicator}
            <AnimatePresence initial={false}>
              {localNotes.map((note) => (
                <motion.div
                  key={note.id}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  onContextMenu={(e) => handleNoteRightClick(e, note)}
                  onMouseEnter={onCardEnter}
                  onMouseLeave={onCardLeave}
                  className={clsx('note-card', currentNote?.id === note.id && 'active')}
                >
                  <NoteItemContent
                    note={note}
                    showDragHandle={false}
                    dateDisplayMode={dateDisplayMode}
                    onSelectNote={onSelectNote}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </MotionConfig>
        {onEmptyTrash && emptyTrashFooter}
        {sharedModals}
        {sortPortal}
      </>
    );
  }

  return (
    <>
      {header}
      <MotionConfig transition={isDragging ? { layout: { duration: 0.2 } } : { layout: { duration: 0 } }}>
        <div key={contextType + (contextId ?? '')} ref={noteListRef} className="notelist-scroll" style={{ position: 'relative' }}>
          {NoteIndicator}
          {groups.map((group) => (
            <Fragment key={group.label}>
              <div className="notelist-group-label">{group.label}</div>
              <Reorder.Group
                axis="y"
                values={group.items}
                onReorder={handleGroupReorder}
                style={{ padding: 0, margin: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '2px' }}
              >
                <AnimatePresence initial={false}>
                  {group.items.map((note) => (
                    <ReorderNoteItem
                      key={note.id}
                      note={note}
                      isSelected={currentNote?.id === note.id}
                      onSelectNote={onSelectNote}
                      showDragHandle={!isTrash}
                      dateDisplayMode={dateDisplayMode}
                      onRightClick={handleNoteRightClick}
                      onDragStart={handleReorderDragStart}
                      onDragEnd={handleReorderDragEnd}
                      onMouseEnter={onCardEnter}
                      onMouseLeave={onCardLeave}
                    />
                  ))}
                </AnimatePresence>
              </Reorder.Group>
            </Fragment>
          ))}
        </div>
      </MotionConfig>
      {onCreateNote && (
        <div className="notelist-footer">
          <button type="button" onClick={onCreateNote} disabled={isCreating} className="notelist-new-btn">
            <Plus style={{ width: 14, height: 14, flexShrink: 0 }} />
            {isCreating ? 'Creating…' : 'New Note'}
          </button>
        </div>
      )}
      {sharedModals}
      {sortPortal}
    </>
  );
};

export default NoteList;
