import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Note } from '../types';
import { noteService } from '../services/note.service';
import { useNoteStore } from '../store/useNoteStore';
import { useAuthStore } from '../store/useAuthStore';
import { useLenisScroll } from '../hooks/useLenisScroll';
import { useToast } from '../components/ui/ToastContainer';
import { getApiErrorMessage } from '../lib/apiError';
import CoverPickerModal, { type CoverTarget } from '../components/home/CoverPickerModal';
import NoteMonthGrid from '../components/home/NoteMonthGrid';
import DraggableNoteGrid from '../components/home/DraggableNoteGrid';
import ViewModeToggle from '../components/home/ViewModeToggle';
import { useViewMode } from '../hooks/useViewMode';
import { useNoteCardMenu } from '../components/home/useNoteCardMenu';
import BackButton from '../components/home/BackButton';
import EmptyTrashModal from '../components/modals/EmptyTrashModal';
import { noteCountLabel } from '../lib/noteText';
import { getCachedList, setCachedList } from '../lib/listCache';

export type NoteCategory = 'all' | 'favorites' | 'archived' | 'trash' | 'shared';

interface CategoryMeta {
  greeting: string;
  headline: string;
  empty: string;
  filter: { pinned?: boolean; favorite?: boolean; archived?: boolean; deleted?: boolean; shared?: boolean };
}

const META: Record<NoteCategory, CategoryMeta> = {
  all:       { greeting: 'Thoughts',        headline: 'Everything you’ve written.',  empty: 'No notes yet.',              filter: { archived: false, deleted: false } },
  favorites: { greeting: 'Favorites',       headline: 'The thoughts you love.',      empty: 'No favorites yet.',          filter: { favorite: true, archived: false, deleted: false } },
  archived:  { greeting: 'Archived',        headline: 'Set aside, not forgotten.',   empty: 'Nothing archived.',          filter: { archived: true, deleted: false } },
  trash:     { greeting: 'Deleted',         headline: 'On its way out.',             empty: 'Trash is empty.',            filter: { deleted: true } },
  shared:    { greeting: 'Collaborations',   headline: 'Notes, shared both ways.',     empty: 'No collaborations yet.',     filter: { shared: true } },
};

// Categories whose order is draggable + persisted; value is the backend contextType
// (shared with the matching Home section, so the order stays in sync both ways).
const ORDER_CONTEXT: Partial<Record<NoteCategory, string>> = {
  favorites: 'favorites',
  archived: 'archive',
};

// Non-draggable categories load in pages (a sentinel appends the next page on
// scroll). Draggable ones need the full set: persisting an order must cover
// every card, and 'shared' merges two server-ordered groups.
const PAGED_CATEGORIES: NoteCategory[] = ['all', 'trash'];
const PAGE_SIZE = 60;

// A note created/edited between two page loads shifts the offsets — appending
// can then deliver a card the list already shows.
function appendUnique(prev: Note[], more: Note[]): Note[] {
  const seen = new Set(prev.map((n) => n.id));
  return [...prev, ...more.filter((n) => !seen.has(n.id))];
}

interface NotesViewProps {
  category: NoteCategory;
  onOpenInline: (note: Note, originRect?: DOMRect) => void;
  onBack: () => void;
  // Bumped when the editor closes → refetch so created/edited notes reflect.
  refreshSignal?: number;
}

// One view per Home category (mirrors SpacesView) — all notes of the category, pinned
// ones in a group on top, the rest below (draggable for the ordered categories).
const NotesView = ({ category, onOpenInline, onBack, refreshSignal }: NotesViewProps) => {
  const meta = META[category];
  const contextType = ORDER_CONTEXT[category];
  const paged = PAGED_CATEGORIES.includes(category);
  const userId = useAuthStore((s) => s.user?.id);
  // Layout preference is remembered per category (e.g. Favorites as a list, All as tiles).
  const [view, setView] = useViewMode(`notes:${category}`);
  const [notes, setNotes] = useState<Note[]>(() => getCachedList<Note>(`notes:${category}`) ?? []);
  // Server-side count of the category; drives the count label and the sentinel.
  const [total, setTotal] = useState<number | null>(null);
  const [coverTarget, setCoverTarget] = useState<CoverTarget | null>(null);
  const [showEmptyTrash, setShowEmptyTrash] = useState(false);
  // FLIP stays silent until the first network load lands, so the cache→network reconcile
  // doesn't glide the cards when the view opens.
  const [armed, setArmed] = useState(false);
  const createNote = useNoteStore((s) => s.createNote);
  const toast = useToast();
  const scrollRef = useRef<HTMLElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  useLenisScroll(scrollRef, contentRef, `notes:${category}`);

  const load = useCallback(() => {
    if (PAGED_CATEGORIES.includes(category)) {
      noteService
        .getNotesPage({ ...META[category].filter, limit: PAGE_SIZE })
        .then(({ notes: d, total: t }) => { setNotes(d); setTotal(t); setCachedList(`notes:${category}`, d); setArmed(true); })
        .catch(() => {});
      return;
    }
    noteService.getAllNotes(META[category].filter).then((d) => { setNotes(d); setTotal(d.length); setCachedList(`notes:${category}`, d); setArmed(true); }).catch(() => {});
  }, [category]);

  useEffect(() => { load(); }, [load, refreshSignal]);

  // Appends the next page when the sentinel scrolls near; guarded against
  // concurrent fetches, and reads list state via ref so the observer callback
  // never holds a stale page.
  const loadingMoreRef = useRef(false);
  const listStateRef = useRef({ count: 0, total: null as number | null });
  useLayoutEffect(() => { listStateRef.current = { count: notes.length, total }; });
  const loadMore = useCallback(() => {
    const { count, total: t } = listStateRef.current;
    if (loadingMoreRef.current || t === null || count >= t) return;
    loadingMoreRef.current = true;
    noteService
      .getNotesPage({ ...META[category].filter, limit: PAGE_SIZE, offset: count })
      .then(({ notes: more, total: nextTotal }) => {
        setNotes((prev) => appendUnique(prev, more));
        setTotal(nextTotal);
      })
      .catch(() => {})
      .finally(() => { loadingMoreRef.current = false; });
  }, [category]);

  const hasMore = paged && total !== null && notes.length < total;
  const sentinelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasMore) return;
    const io = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) loadMore(); },
      // The view scrolls inside home-main, not the window; generous margin so
      // the next page is usually there before the user reaches the edge.
      { root: scrollRef.current, rootMargin: '900px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [hasMore, loadMore]);

  const setCover = (n: Note) => setCoverTarget({ kind: 'note', id: n.id });
  const noteMenu = useNoteCardMenu({ onEdit: onOpenInline, onAfterChange: load, onSetCover: setCover, shared: category === 'shared' });

  const pinned = useMemo(() => notes.filter((n) => n.isPinned), [notes]);
  const rest = useMemo(() => notes.filter((n) => !n.isPinned), [notes]);

  // Collaborations view splits every note into two drag-ordered groups: notes shared
  // with me (context 'shared') and my own notes shared out ('shared-owned'). Pinned
  // notes stay inside their own group (floated to the top by the backend), so the
  // categories never collapse into a shared Pinned block.
  const sharedWithMe = useMemo(() => notes.filter((n) => n.userId !== userId), [notes, userId]);
  const sharedByMe = useMemo(() => notes.filter((n) => n.userId === userId), [notes, userId]);
  const persistOrder = useCallback(
    (group: Note[], context: string) =>
      noteService.reorderNotes(group.map((n, i) => ({ id: n.id, order: i })), context, null).catch(() => {}),
    [],
  );
  const handleReorderWithMe = useCallback(
    (reordered: Note[]) => { setNotes([...reordered, ...sharedByMe]); persistOrder(reordered, 'shared'); },
    [sharedByMe, persistOrder],
  );
  const handleReorderByMe = useCallback(
    (reordered: Note[]) => { setNotes([...sharedWithMe, ...reordered]); persistOrder(reordered, 'shared-owned'); },
    [sharedWithMe, persistOrder],
  );

  // Persist the merged order (pinned first) to the category's context, mirroring how
  // the Home sections persist — so dragging here and on Home stay in sync.
  const persist = useCallback(
    (full: Note[]) => {
      setNotes(full);
      if (contextType) {
        noteService
          .reorderNotes(full.map((n, i) => ({ id: n.id, order: i })), contextType, null)
          .catch(() => {});
      }
    },
    [contextType],
  );
  const handleReorderPinned = (reordered: Note[]) => persist([...reordered, ...rest]);
  const handleReorderRest = (reordered: Note[]) => persist([...pinned, ...reordered]);

  // This list lives in local state, not the store — patch the new cover in so the card
  // reflects it immediately instead of only after the next load().
  const handleCoverChange = useCallback((target: CoverTarget, coverImage: string) => {
    if (target.kind !== 'note') return;
    setNotes((prev) => prev.map((n) => (n.id === target.id ? { ...n, coverImage } : n)));
  }, []);

  const handleNewNote = async (originRect?: DOMRect) => {
    try {
      const note = await createNote({ content: '' });
      onOpenInline(note, originRect);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Could not create note'));
    }
  };

  const handleEmptyTrash = async () => {
    try {
      // Server-side bulk delete — the loaded page may be only part of the trash.
      await noteService.emptyTrash();
      toast.success('Trash emptied');
    } catch {
      toast.error('Could not empty trash');
    } finally {
      setShowEmptyTrash(false);
      load();
    }
  };

  return (
    <main ref={scrollRef} className="home-main">
      <div ref={contentRef} className="home-content">
        <div className="home-view-topbar">
          {notes.length > 0 && <ViewModeToggle value={view} onChange={setView} />}
          {category === 'all' && (
            <button type="button" className="home-view-action" onClick={(e) => handleNewNote(e.currentTarget.getBoundingClientRect())}>
              <Plus size={16} strokeWidth={1.75} /> New Note
            </button>
          )}
          {category === 'trash' && notes.length > 0 && (
            <button type="button" className="home-view-action danger" onClick={() => setShowEmptyTrash(true)}>
              <Trash2 size={16} strokeWidth={1.75} /> Delete All
            </button>
          )}
          <BackButton onClick={onBack} />
        </div>
        <header className="home-header">
          <p className="home-greeting">{meta.greeting}</p>
          <h1 className="home-headline">{meta.headline}</h1>
          {notes.length > 0 && <p className="home-count">{noteCountLabel(total ?? notes.length)}</p>}
        </header>

        {notes.length === 0 ? (
          <p className="home-empty">{meta.empty}</p>
        ) : category === 'trash' ? (
          <NoteMonthGrid notes={notes} onOpen={onOpenInline} onMenu={noteMenu.openMenu} onSetCover={setCover} armed={armed} view={view} countdown />
        ) : category === 'shared' ? (
          <>
            {sharedWithMe.length > 0 && (
              <section className="notes-month-group">
                <div className="notes-month-label">Shared with me</div>
                <DraggableNoteGrid notes={sharedWithMe} onOpen={onOpenInline} onMenu={noteMenu.openMenu} onSetCover={setCover} onReorder={handleReorderWithMe} armed={armed} view={view} showSubtitle />
              </section>
            )}
            {sharedByMe.length > 0 && (
              <section className="notes-month-group">
                <div className="notes-month-label">Shared</div>
                <DraggableNoteGrid notes={sharedByMe} onOpen={onOpenInline} onMenu={noteMenu.openMenu} onSetCover={setCover} onReorder={handleReorderByMe} armed={armed} view={view} showSubtitle />
              </section>
            )}
          </>
        ) : (
          <>
            {pinned.length > 0 && (
              <section className="notes-month-group">
                <div className="notes-month-label">Pinned</div>
                <DraggableNoteGrid
                  notes={pinned}
                  onOpen={onOpenInline}
                  onMenu={noteMenu.openMenu}
                  onSetCover={setCover}
                  onReorder={contextType ? handleReorderPinned : undefined}
                  armed={armed}
                  view={view}
                  showSubtitle
                />
              </section>
            )}
            {rest.length > 0 &&
              (contextType ? (
                <section className="notes-month-group notes-rest">
                  <DraggableNoteGrid
                    notes={rest}
                    onOpen={onOpenInline}
                    onMenu={noteMenu.openMenu}
                    onSetCover={setCover}
                    onReorder={handleReorderRest}
                    armed={armed}
                    view={view}
                    showSubtitle
                  />
                </section>
              ) : (
                <NoteMonthGrid notes={rest} onOpen={onOpenInline} onMenu={noteMenu.openMenu} onSetCover={setCover} armed={armed} view={view} />
              ))}
          </>
        )}

        {/* Invisible load-more trigger; pages append quietly as it nears the viewport. */}
        {hasMore && <div ref={sentinelRef} aria-hidden="true" className="h-px" />}
      </div>

      <CoverPickerModal target={coverTarget} onClose={() => setCoverTarget(null)} onCoverChange={handleCoverChange} />
      {noteMenu.element}
      <EmptyTrashModal isOpen={showEmptyTrash} onClose={() => setShowEmptyTrash(false)} onConfirm={handleEmptyTrash} />
    </main>
  );
};

export default NotesView;
