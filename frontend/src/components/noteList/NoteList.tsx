import { startOfDay, startOfWeek, startOfMonth } from 'date-fns';
import { useMagicHover } from '../../hooks/useMagicHover';
import { Note } from '../../types';
import { Plus, Trash2, Search, SlidersHorizontal, ArrowUp, ArrowDown } from 'lucide-react';
import clsx from 'clsx';
import { useState, useEffect, useLayoutEffect, useRef, useCallback, useMemo, Fragment } from 'react';
import { AnimatePresence, motion, useMotionValue, useMotionTemplate, animate } from 'motion/react';
import { useShallow } from 'zustand/react/shallow';
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
import NoteListItem, { NoteItemContent, type ExitRect } from './NoteItem';
import { getFirstLine } from './noteListUtils';
import { usePresenceList, type PresenceItem } from './usePresenceList';

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
  justCreatedNoteIds?: string[];
  onEmptyTrash?: () => void;
  focusSearchTrigger?: number;
}

// ── Component ─────────────────────────────────────────────────────────────────

const NoteList = ({
  notes, currentNote, onSelectNote, onNotesReordered,
  viewLabel, contextType, contextId, isTrash,
  sortBy, sortOrder, onSortChange,
  onCreateNote, isCreating, justCreatedNoteIds, onEmptyTrash, focusSearchTrigger,
}: NoteListProps) => {

  // ── Hooks ──────────────────────────────────────────────────────────────────

  // Gezielte Selektoren statt Voll-Store-Abo: isLoading-Flips der Fetches dürfen
  // die Liste nicht mitten in laufenden Animationen neu rendern
  const { updateNote, togglePin, toggleFavorite, toggleArchive, toggleTrash, deleteNote, searchNotes, noteCounts } = useNoteStore(
    useShallow((s) => ({
      updateNote: s.updateNote, togglePin: s.togglePin, toggleFavorite: s.toggleFavorite,
      toggleArchive: s.toggleArchive, toggleTrash: s.toggleTrash, deleteNote: s.deleteNote,
      searchNotes: s.searchNotes, noteCounts: s.noteCounts,
    })),
  );
  const dateDisplayMode = useSettingsStore((s) => s.dateDisplayMode);
  const toast = useToast();

  // ── State ──────────────────────────────────────────────────────────────────

  const sortMenuInnerRef = useRef<HTMLDivElement>(null);
  const { onItemEnter: onSortEnter, onItemLeave: onSortLeave, Indicator: SortIndicator } = useMagicHover({ mode: 'free', borderRadius: 6, ref: sortMenuInnerRef });

  // Only non-null while a drag-reorder result is being persisted
  const [dragNotes, setDragNotes] = useState<Note[] | null>(null);
  const [dragNoteId, setDragNoteId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<{ id: string | null; pos: 'top' | 'bottom' | null }>({ id: null, pos: null });
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
  const [pillStyle, setPillStyle] = useState({ left: 0, width: 0 });
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const tabContainerRef = useRef<HTMLDivElement>(null);
  const { onItemEnter: onTabEnter, onItemLeave: onTabLeave, Indicator: TabIndicator } = useMagicHover({ mode: 'free', borderRadius: 20, ref: tabContainerRef });
  const [sortFieldMenuOpen, setSortFieldMenuOpen] = useState(false);
  const [sortMenuAnchor, setSortMenuAnchor] = useState<PopupAnchor | null>(null);
  const [searchHovered, setSearchHovered] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const searchMouseX = useMotionValue(0);
  const searchMouseY = useMotionValue(0);
  const searchGradient = useMotionTemplate`radial-gradient(120px circle at ${searchMouseX}px ${searchMouseY}px, var(--accent), transparent 80%)`;
  const searchGlowActive = searchHovered && !searchFocused;
  const searchGlowOpacity = useMotionValue(0);
  useEffect(() => {
    animate(searchGlowOpacity, searchGlowActive ? 1 : 0, { duration: searchGlowActive ? 0.25 : 0.55, ease: 'easeOut' });
  }, [searchGlowActive]);

  // ── Refs ───────────────────────────────────────────────────────────────────

  // Stable reference for use inside async callbacks (handleNoteDrop)
  const localNotesRef = useRef<Note[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  // FLIP-Daten für den Pop-Exit: Positionen aller Karten/Labels vom letzten Commit
  // (relativ zum Scroll-Container, da offsetParent)
  const flipRectsRef = useRef<Map<string, ExitRect>>(new Map());
  const prevExitingIdsRef = useRef<Set<string>>(new Set());
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
      // Optimistisch getrashte Notes sofort raus, damit der Exit direkt startet
      if (n.isDeleted) return false;
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
    let sorted: Note[];
    if (sortBy === 'manual') {
      sorted = displayNotes;
    } else {
      sorted = [...displayNotes].sort((a, b) => {
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
    }
    if (justCreatedNoteIds?.length) {
      const idSet = new Set(justCreatedNoteIds);
      const pinned = sorted.filter(n => n.isPinned);
      const created = sorted.filter(n => !n.isPinned && idSet.has(n.id))
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      const rest = sorted.filter(n => !n.isPinned && !idSet.has(n.id));
      sorted = [...pinned, ...created, ...rest];
    }
    return sorted;
  }, [dragNotes, displayNotes, sortBy, sortOrder, justCreatedNoteIds]);

  // Exitende Notes bleiben für die Dauer ihrer CSS-Exit-Transition in der Liste
  const presence = usePresenceList(localNotes);

  // Group into pinned + month buckets for the reorder view (aus der Presence-Liste,
  // damit exitende Karten an ihrer Position bleiben)
  const groups = useMemo(() => {
    const pinned = presence.filter(it => it.note.isPinned);
    const rest   = presence.filter(it => !it.note.isPinned);
    const monthMap = new Map<string, PresenceItem[]>();
    rest.forEach(it => {
      const key = new Date(it.note.updatedAt).toLocaleDateString(undefined, { month: 'short', year: 'numeric' }).toUpperCase();
      if (!monthMap.has(key)) monthMap.set(key, []);
      monthMap.get(key)!.push(it);
    });
    const result: { label: string; items: PresenceItem[] }[] = [];
    if (pinned.length) result.push({ label: 'PINNED', items: pinned });
    monthMap.forEach((items, label) => result.push({ label, items }));
    return result;
  }, [presence]);

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
    setDragNoteId(null);
    setDragOver({ id: null, pos: null });
  }, [contextType, contextId]);

  useLayoutEffect(() => {
    const idx = listTabs.findIndex(t => t.id === listTab);
    const el = tabRefs.current[idx];
    if (el) setPillStyle({ left: el.offsetLeft, width: el.offsetWidth });
  }, [listTab]);

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

  // FLIP für den Pop-Exit: Beim Löschen verlässt die Karte das Layout sofort —
  // alle Elemente darunter springen hoch und gleiten von ihrem Versatz per
  // Compositor-Transform auf 0 zurück. Positionen werden bei jedem Commit
  // festgehalten, damit der "Vorher"-Stand beim nächsten Löschen vorliegt.
  useLayoutEffect(() => {
    const container = scrollRef.current;
    const prevExiting = prevExitingIdsRef.current;
    const currentExiting = new Set(presence.filter(it => it.exiting).map(it => it.note.id));
    prevExitingIdsRef.current = currentExiting;
    if (!container) {
      flipRectsRef.current = new Map();
      return;
    }
    const els = Array.from(container.querySelectorAll<HTMLElement>('[data-flip-id]'));
    const hasNewExit = [...currentExiting].some(id => !prevExiting.has(id));
    if (hasNewExit && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      els.forEach(el => {
        const id = el.dataset.flipId!;
        if (currentExiting.has(id)) return;
        const old = flipRectsRef.current.get(id);
        if (old == null) return;
        const delta = old.top - el.offsetTop;
        if (Math.abs(delta) < 0.5) return;
        el.animate(
          [{ transform: `translateY(${delta}px)` }, { transform: 'translateY(0)' }],
          { duration: 240, easing: 'cubic-bezier(.22,.7,.18,1)' },
        );
      });
    }
    const next = new Map<string, ExitRect>();
    els.forEach(el => next.set(el.dataset.flipId!, { top: el.offsetTop, left: el.offsetLeft, width: el.offsetWidth }));
    flipRectsRef.current = next;
  });

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

  const handleNoteRightClick = useCallback((e: React.MouseEvent, note: Note) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ isOpen: true, position: { x: e.clientX, y: e.clientY }, note });
  }, []);

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

  // ── Drag / reorder handlers (natives HTML5-DnD wie im Dashboard_v2-Prototyp) ──

  const handleNoteDragStart = useCallback((e: React.DragEvent, note: Note) => {
    setDragNoteId(note.id);
    e.dataTransfer.effectAllowed = 'move';
    try { e.dataTransfer.setData('text/plain', note.id); } catch { /* einige Browser werfen hier */ }
  }, []);

  const handleNoteDragOver = useCallback((e: React.DragEvent, note: Note) => {
    e.preventDefault();
    const r = e.currentTarget.getBoundingClientRect();
    const pos = e.clientY - r.top < r.height / 2 ? 'top' as const : 'bottom' as const;
    setDragOver(prev => (prev.id === note.id && prev.pos === pos ? prev : { id: note.id, pos }));
  }, []);

  const handleNoteDragEnd = useCallback(() => {
    setDragNoteId(null);
    setDragOver({ id: null, pos: null });
  }, []);

  const handleNoteDrop = useCallback(async (e: React.DragEvent, target: Note) => {
    e.preventDefault();
    const sourceId = dragNoteId;
    const pos = dragOver.id === target.id ? dragOver.pos : null;
    setDragNoteId(null);
    setDragOver({ id: null, pos: null });
    if (!sourceId || sourceId === target.id || !pos) return;

    const base = localNotesRef.current;
    const source = base.find(n => n.id === sourceId);
    if (!source) return;
    const without = base.filter(n => n.id !== sourceId);
    const targetIdx = without.findIndex(n => n.id === target.id);
    if (targetIdx === -1) return;
    const insertAt = pos === 'top' ? targetIdx : targetIdx + 1;
    const reordered = [...without.slice(0, insertAt), source, ...without.slice(insertAt)];

    setDragNotes(reordered);
    onSortChange('manual', sortOrder);
    const noteOrders = reordered.map((note, index) => ({ id: note.id, order: index }));
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
  }, [dragNoteId, dragOver, sortOrder, contextType, contextId, onNotesReordered, onSortChange]);

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
        className="p-px notelist-search-wrapper"
      >
        <motion.div
          style={{ position: 'absolute', inset: 0, background: searchGradient, borderRadius: 'inherit', pointerEvents: 'none', opacity: searchGlowOpacity }}
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
        <div style={{ position: 'relative', marginTop: '10px' }}>
          <div ref={tabContainerRef} style={{ position: 'relative', display: 'flex', gap: '4px' }}>
            {TabIndicator}
            <div
              style={{
                position: 'absolute',
                top: 0,
                bottom: 0,
                left: pillStyle.left,
                width: pillStyle.width,
                background: 'color-mix(in oklch, var(--accent) 12%, transparent)',
                border: '0.5px solid color-mix(in oklch, var(--accent) 40%, transparent)',
                borderRadius: '20px',
                transition: 'left 0.22s cubic-bezier(0.23, 1, 0.32, 1), width 0.22s cubic-bezier(0.23, 1, 0.32, 1)',
                pointerEvents: 'none',
              }}
            />
            {listTabs.map((t, i) => (
              <button
                key={t.id}
                ref={el => { tabRefs.current[i] = el; }}
                type="button"
                onClick={() => setListTab(t.id)}
                onMouseEnter={onTabEnter}
                onMouseLeave={onTabLeave}
                className="notelist-tab-btn"
                style={{
                  fontFamily: 'var(--mono)',
                  fontSize: '9px',
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase' as const,
                  padding: '3px 10px',
                  cursor: 'pointer',
                  position: 'relative',
                  zIndex: 1,
                  color: listTab === t.id ? 'var(--accent)' : 'var(--ink-low)',
                  transition: 'color 0.22s, background 0.15s',
                  background: 'transparent',
                  border: '0.5px solid color-mix(in oklch, var(--ink-low) 40%, transparent)',
                  borderRadius: '20px',
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
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
          className="fixed overflow-hidden z-3 border border-(--line) border-t-0"
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
          <div ref={sortMenuInnerRef} className="pt-2 pb-4 relative">
            {SortIndicator}
            {(Object.entries(sortLabels) as [SortOption, string][]).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => { onSortChange(value, sortOrder); setSortFieldMenuOpen(false); setSortMenuAnchor(null); }}
                onMouseEnter={onSortEnter}
                onMouseLeave={onSortLeave}
                className={clsx('w-full px-3 py-2 text-left text-sm relative z-1', sortBy === value ? 'text-(--accent)' : '')}
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
      <button type="button" onClick={onEmptyTrash} disabled={notes.length === 0} className="notelist-trash-btn">
        <Trash2 style={{ width: 13, height: 13, flexShrink: 0 }} />
        Empty Trash
      </button>
    </div>
  ) : null;

  // ── Render ─────────────────────────────────────────────────────────────────

  // Solange noch Exits laufen, Liste weiterrendern (z. B. letzte Note gelöscht)
  if (displayNotes.length === 0 && !presence.some(it => it.exiting)) {
    return (
      <>
        {header}
        <div className="notelist-empty">
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
        <div className="notelist-scroll">
          {localNotes.map((note) => (
            <div
              key={note.id}
              onContextMenu={(e) => handleNoteRightClick(e, note)}
              className={clsx('note-card', currentNote?.id === note.id && 'active')}
            >
              <NoteItemContent
                note={note}
                showDragHandle={false}
                dateDisplayMode={dateDisplayMode}
                onSelectNote={onSelectNote}
              />
            </div>
          ))}
        </div>
        {onEmptyTrash && emptyTrashFooter}
        {sharedModals}
        {sortPortal}
      </>
    );
  }

  let renderIndex = 0;

  return (
    <>
      {header}
      <div ref={scrollRef} className="notelist-scroll" style={{ position: 'relative' }}>
          {groups.map((group) => (
            <Fragment key={group.label}>
              <div className="notelist-group-label" data-flip-id={`label:${group.label}`}>{group.label}</div>
              <ul style={{ padding: 0, margin: 0, listStyle: 'none', display: 'flex', flexDirection: 'column' }}>
                {group.items.map((it) => {
                  const stagger = Math.min(renderIndex++, 8) * 28;
                  return (
                    <NoteListItem
                      key={it.note.id}
                      note={it.note}
                      exiting={it.exiting}
                      exitRect={it.exiting ? flipRectsRef.current.get(it.note.id) ?? null : null}
                      stagger={stagger}
                      isSelected={currentNote?.id === it.note.id}
                      onSelectNote={onSelectNote}
                      showDragHandle={!isTrash}
                      dateDisplayMode={dateDisplayMode}
                      onRightClick={handleNoteRightClick}
                      isDragSource={dragNoteId === it.note.id}
                      dragOverPos={dragOver.id === it.note.id && dragNoteId !== it.note.id ? dragOver.pos : null}
                      onDragStartItem={handleNoteDragStart}
                      onDragOverItem={handleNoteDragOver}
                      onDropItem={handleNoteDrop}
                      onDragEndItem={handleNoteDragEnd}
                    />
                  );
                })}
              </ul>
            </Fragment>
          ))}
        </div>
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
