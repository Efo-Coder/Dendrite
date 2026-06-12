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
import NoteListItem, { type ExitRect } from './NoteItem';
import { getFirstLine } from './noteListUtils';
import { usePresenceList, type PresenceItem } from './usePresenceList';

// ── Types ─────────────────────────────────────────────────────────────────────

export type SortOption = 'createdAt' | 'updatedAt' | 'title' | 'pinned' | 'manual';
type ListTab = 'all' | 'today' | 'week' | 'month';

// ── Drag-Helfer ───────────────────────────────────────────────────────────────

// Gruppenzugehörigkeit einer Note (PINNED bzw. Monats-Bucket der Liste)
const groupKeyOf = (n: Note) =>
  n.isPinned ? 'PINNED' : new Date(n.updatedAt).toLocaleDateString(undefined, { month: 'short', year: 'numeric' }).toUpperCase();

// Laufender Pointer-Drag (Karte hängt am Cursor)
interface DragState {
  id: string;
  el: HTMLElement;
  startPointerY: number;
  startTop: number;
  lastDy: number;
  height: number;
  moved: boolean;
  abort: AbortController;
}

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

  // Live-Preview-Reihenfolge während des Drags bzw. bis der Persist-Refetch landet
  const [dragNotes, setDragNotes] = useState<Note[] | null>(null);
  const [dragNoteId, setDragNoteId] = useState<string | null>(null);
  const dragStateRef = useRef<DragState | null>(null);
  const dragOriginRef = useRef<Note[] | null>(null);
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

  // Exitende Notes bleiben für die Dauer ihrer CSS-Exit-Transition in der Liste;
  // Kategorie-Wechsel resettet ohne Exit-Choreografie
  const presence = usePresenceList(localNotes, contextType + (contextId ?? ''));

  // Group into pinned + month buckets for the reorder view (aus der Presence-Liste,
  // damit exitende Karten an ihrer Position bleiben)
  const groups = useMemo(() => {
    const pinned = presence.filter(it => it.note.isPinned);
    const rest   = presence.filter(it => !it.note.isPinned);
    const monthMap = new Map<string, PresenceItem[]>();
    rest.forEach(it => {
      const key = groupKeyOf(it.note);
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
    dragStateRef.current?.abort.abort();
    dragStateRef.current = null;
    document.documentElement.classList.remove('note-dragging');
    setDragNotes(null);
    setDragNoteId(null);
    dragOriginRef.current = null;
  }, [contextType, contextId]);

  // Laufenden Drag beim Unmount sauber beenden
  useEffect(() => () => {
    dragStateRef.current?.abort.abort();
    document.documentElement.classList.remove('note-dragging');
  }, []);

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

  // FLIP für Pop-Exit und Drag-Preview: Wenn Elemente ihre Layout-Position
  // wechseln (Karte gelöscht oder Reihenfolge beim Ziehen umgestellt), gleiten
  // sie von ihrem alten Versatz per Compositor-Transform auf 0 zurück.
  // Positionen werden bei jedem Commit festgehalten ("Vorher"-Stand).
  const prevDragIdRef = useRef<string | null>(null);
  useLayoutEffect(() => {
    const container = scrollRef.current;
    const prevExiting = prevExitingIdsRef.current;
    const currentExiting = new Set(presence.filter(it => it.exiting).map(it => it.note.id));
    prevExitingIdsRef.current = currentExiting;
    const dragActive = dragNoteId !== null || prevDragIdRef.current !== null;
    prevDragIdRef.current = dragNoteId;
    if (!container) {
      flipRectsRef.current = new Map();
      return;
    }
    const els = Array.from(container.querySelectorAll<HTMLElement>('[data-flip-id]'));
    const hasNewExit = [...currentExiting].some(id => !prevExiting.has(id));
    if ((hasNewExit || dragActive) && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      els.forEach(el => {
        const id = el.dataset.flipId!;
        const st = dragStateRef.current;
        if (st && id === st.id) {
          // Karte hängt am Cursor — Layout-Sprung kompensieren statt animieren
          el.style.transform = `translateY(${st.startTop + st.lastDy - el.offsetTop}px)`;
          return;
        }
        if (currentExiting.has(id)) return;
        const old = flipRectsRef.current.get(id);
        if (old == null) return;
        const delta = old.top - el.offsetTop;
        if (Math.abs(delta) < 0.5) return;
        el.animate(
          [{ transform: `translateY(${delta}px)` }, { transform: 'translateY(0)' }],
          { duration: 280, easing: 'cubic-bezier(.3,1.25,.35,1)' },
        );
      });
    }
    const next = new Map<string, ExitRect>();
    els.forEach(el => next.set(el.dataset.flipId!, { top: el.offsetTop, left: el.offsetLeft, width: el.offsetWidth, height: el.offsetHeight }));
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

  // ── Drag / reorder handlers ────────────────────────────────────────────────
  // Pointer-Events-Drag mit Live-Preview: Die Karte hängt per Transform am Cursor,
  // die Geschwister gleiten per FLIP aus dem Weg, beim Loslassen settelt die Karte
  // federnd in die Lücke — die Reihenfolge ist dann bereits final.

  const persistDragOrder = useCallback(async (origin: Note[] | null) => {
    const reordered = localNotesRef.current;
    // Nichts bewegt → nichts persistieren
    if (origin && origin.length === reordered.length && origin.every((n, i) => n.id === reordered[i].id)) {
      setDragNotes(null);
      return;
    }
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
  }, [sortOrder, contextType, contextId, onNotesReordered, onSortChange]);

  const handleCardPointerDown = useCallback((e: React.PointerEvent, note: Note) => {
    if (e.button !== 0 || dragStateRef.current) return;
    const li = (e.currentTarget as HTMLElement).closest<HTMLElement>('[data-flip-id]');
    if (!li) return;
    // Kein preventDefault und noch kein Drag-State: Ein einfacher Klick soll die
    // Note normal öffnen — der Drag startet erst ab der Bewegungs-Schwelle.

    const abort = new AbortController();
    const st: DragState = {
      id: note.id,
      el: li,
      startPointerY: e.clientY,
      startTop: li.offsetTop,
      lastDy: 0,
      height: li.offsetHeight,
      moved: false,
      abort,
    };
    dragStateRef.current = st;

    const onMove = (ev: PointerEvent) => {
      const rawDy = ev.clientY - st.startPointerY;
      if (!st.moved) {
        if (Math.abs(rawDy) < 5) return;
        // Schwelle überschritten → Drag wirklich starten
        st.moved = true;
        dragOriginRef.current = localNotesRef.current;
        setDragNoteId(st.id);
        document.documentElement.classList.add('note-dragging');
        window.getSelection()?.removeAllRanges();
        st.el.style.zIndex = '2';
      }

      const base = localNotesRef.current;
      const source = base.find(n => n.id === st.id);
      if (!source) return;

      // Drag-Grenze: Die Karte bleibt im vertikalen Bereich ihrer Gruppe —
      // weiter kann sie ohnehin nicht einsortiert werden
      let minTop = st.startTop;
      let maxBottom = st.startTop + st.height;
      for (const n of base) {
        if (groupKeyOf(n) !== groupKeyOf(source)) continue;
        const rect = flipRectsRef.current.get(n.id);
        if (!rect) continue;
        minTop = Math.min(minTop, rect.top);
        maxBottom = Math.max(maxBottom, rect.top + rect.height);
      }
      const dy = Math.min(Math.max(rawDy, minTop - st.startTop), maxBottom - st.height - st.startTop);
      st.lastDy = dy;

      // Karte folgt dem Cursor — relativ zur aktuellen Layout-Position
      st.el.style.transform = `translateY(${st.startTop + dy - st.el.offsetTop}px)`;

      // Einfüge-Position: getauscht wird, sobald der Mittelpunkt eines Ziel-Items
      // deutlich in die Spanne der gezogenen Karte ragt (25%-Einzug von den Kanten) —
      // früher als beim Mittelpunkt-Kreuzen, aber nicht schon bei erster Berührung
      const inset = st.height * 0.25;
      const cardTop = st.startTop + dy;
      const cardBottom = cardTop + st.height;
      let target: Note | null = null;
      let pos: 'top' | 'bottom' = 'top';
      for (const n of base) {
        if (n.id === st.id || groupKeyOf(n) !== groupKeyOf(source)) continue;
        const rect = flipRectsRef.current.get(n.id);
        if (!rect) continue;
        const mid = rect.top + rect.height / 2;
        if (mid >= cardTop + inset && mid <= cardBottom - inset) {
          target = n;
          pos = mid < cardTop + st.height / 2 ? 'top' : 'bottom';
          break;
        }
      }
      if (!target) return;
      const without = base.filter(n => n.id !== st.id);
      const targetIdx = without.findIndex(n => n.id === target!.id);
      if (targetIdx === -1) return;
      const insertAt = pos === 'top' ? targetIdx : targetIdx + 1;
      const preview = [...without.slice(0, insertAt), source, ...without.slice(insertAt)];
      if (!preview.every((n, i) => n.id === base[i]?.id)) setDragNotes(preview);
    };

    const finishDrag = () => {
      abort.abort();
      dragStateRef.current = null;
      if (!st.moved) return; // war nur ein Klick — nichts anfassen
      document.documentElement.classList.remove('note-dragging');
      setDragNoteId(null);
      // Federnder Settle vom aktuellen Versatz in die finale Lücke
      const residual = st.startTop + st.lastDy - st.el.offsetTop;
      st.el.style.transform = '';
      st.el.style.zIndex = '';
      if (Math.abs(residual) > 0.5) {
        st.el.animate(
          [{ transform: `translateY(${residual}px)` }, { transform: 'translateY(0)' }],
          { duration: 320, easing: 'cubic-bezier(.3,1.25,.35,1)' },
        );
      }
      // Den auf das Loslassen folgenden Click schlucken, sonst öffnet er die Note
      const swallowClick = (ce: MouseEvent) => {
        ce.stopPropagation();
        ce.preventDefault();
      };
      window.addEventListener('click', swallowClick, { capture: true, once: true });
      window.setTimeout(() => window.removeEventListener('click', swallowClick, { capture: true }), 0);
      const origin = dragOriginRef.current;
      dragOriginRef.current = null;
      void persistDragOrder(origin);
    };

    window.addEventListener('pointermove', onMove, { signal: abort.signal });
    window.addEventListener('pointerup', finishDrag, { signal: abort.signal });
    window.addEventListener('pointercancel', finishDrag, { signal: abort.signal });
  }, [persistDragOrder]);

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
    let trashIndex = 0;
    return (
      <>
        {header}
        <div key="trash" ref={scrollRef} className="notelist-scroll" style={{ position: 'relative' }}>
          <ul style={{ padding: 0, margin: 0, listStyle: 'none', display: 'flex', flexDirection: 'column' }}>
            {presence.map((it) => {
              const stagger = Math.min(trashIndex++, 8) * 28;
              return (
                <NoteListItem
                  key={it.note.id}
                  note={it.note}
                  exiting={it.exiting}
                  exitRect={it.exiting ? flipRectsRef.current.get(it.note.id) ?? null : null}
                  stagger={stagger}
                  isSelected={currentNote?.id === it.note.id}
                  onSelectNote={onSelectNote}
                  showDragHandle={false}
                  dateDisplayMode={dateDisplayMode}
                  onRightClick={handleNoteRightClick}
                />
              );
            })}
          </ul>
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
      <div key={contextType + (contextId ?? '')} ref={scrollRef} className="notelist-scroll" style={{ position: 'relative' }}>
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
                      onCardPointerDown={handleCardPointerDown}
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
