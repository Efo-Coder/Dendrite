import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, ChevronDown, Plus, SquarePen, Trash2 } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { useNoteStore } from '../store/useNoteStore';
import { useSpaceStore } from '../store/useSpaceStore';
import { useReflectionStore } from '../store/useReflectionStore';
import { useToast } from '../components/ui/ToastContainer';
import { getApiErrorMessage } from '../lib/apiError';
import { noteService } from '../services/note.service';
import { Note, Space } from '../types';
import type { NoteCategory } from './NotesView';
import CoverCard from '../components/home/CoverCard';
import CoverPickerModal, { type CoverTarget } from '../components/home/CoverPickerModal';
import SplitText from '../components/ui/GreetingAnimation';
import HomeSearch from '../components/home/HomeSearch';
import NotificationsBell from '../components/home/NotificationsBell';
import { useLenisScroll } from '../hooks/useLenisScroll';
import DarkModeToggle from '../components/sidebar/DarkModeToggle';
import SettingsModal from '../components/modals/SettingsModal';
import CreateFolderModal from '../components/modals/CreateFolderModal';
import EmptyTrashModal from '../components/modals/EmptyTrashModal';
import { Icons } from '../components/ui/Icons';
import { noteLabel } from '../lib/noteText';
import { timeAgo } from '../lib/timeAgo';
import { quotePrompt } from '../lib/reflectionText';
import { getCachedList, setCachedList } from '../lib/listCache';
import { useNoteCardMenu } from '../components/home/useNoteCardMenu';
import { useSpaceCardMenu } from '../components/home/useSpaceCardMenu';
import { useGridReorder } from '../components/home/useGridReorder';
import { useWheelHorizontal } from '../hooks/useWheelHorizontal';
import { useLeaving } from '../hooks/useLeaving';
import { useCardFlip } from '../hooks/useCardFlip';

interface HomeViewProps {
  onOpenNote: (id: string) => void;
  onOpenInline: (note: Note, originRect?: DOMRect) => void;
  onOpenSpace: (id: string, name: string) => void;
  onOpenCategory: (cat: NoteCategory) => void;
  onAllSpaces: () => void;
  onReflection: () => void;
  onOpenProfile: (userId: string) => void;
}

// Time-of-day greeting, mirrors the workspace titlebar logic. Split out so the
// salutation bucket can be watched on its own to retrigger the entrance animation.
function salutationFor(): string {
  const hour = new Date().getHours();
  return (
    hour >= 5 && hour < 12 ? 'Good morning' :
    hour >= 12 && hour < 18 ? 'Good afternoon' :
    hour >= 18 && hour < 22 ? 'Good evening' :
    'Good night'
  );
}

function greetingFor(name: string): string {
  const salutation = salutationFor();
  return name ? `${salutation}, ${name}` : salutation;
}

const HomeView = ({ onOpenNote, onOpenInline, onOpenSpace, onOpenCategory, onAllSpaces, onReflection, onOpenProfile }: HomeViewProps) => {
  const user = useAuthStore((s) => s.user);
  const notes = useNoteStore((s) => s.notes);
  const fetchNotes = useNoteStore((s) => s.fetchNotes);
  const spaces = useSpaceStore((s) => s.spaces);
  const fetchSpaces = useSpaceStore((s) => s.fetchSpaces);
  const reorderSpaces = useSpaceStore((s) => s.reorderSpaces);
  const createNote = useNoteStore((s) => s.createNote);
  const reflectionPrompt = useReflectionStore((s) => s.prompt);
  const fetchToday = useReflectionStore((s) => s.fetchToday);
  const toast = useToast();
  const [showSettings, setShowSettings] = useState(false);
  const [coverTarget, setCoverTarget] = useState<CoverTarget | null>(null);
  const [showCreateSpace, setShowCreateSpace] = useState(false);
  const [showEmptyTrash, setShowEmptyTrash] = useState(false);
  // Active notes live in the store; favorites/archived/deleted/shared are fetched
  // separately so the store's main list isn't overwritten, and in full (not sliced)
  // so drag-reorder can persist the complete order. Pinned has no own section anymore
  // — pinned notes surface first inside the category views instead.
  // Hydrated from the session cache so the sections render at full height instantly on
  // reload (stable layout for scroll restore); refreshed from the network below.
  const [favorites, setFavorites] = useState<Note[]>(() => getCachedList<Note>('home:favorites') ?? []);
  const [archived, setArchived] = useState<Note[]>(() => getCachedList<Note>('home:archived') ?? []);
  const [deleted, setDeleted] = useState<Note[]>(() => getCachedList<Note>('home:deleted') ?? []);
  const [shared, setShared] = useState<Note[]>(() => getCachedList<Note>('home:shared') ?? []);
  // FLIP stays silent until the first full load lands, so the cache→network reconcile
  // doesn't glide the cards when Home opens. allSettled below resolves after every
  // section's reconcile, so arming can never race ahead of one.
  const [armed, setArmed] = useState(false);

  // Recent + Deleted show a strip and never drag-persist a full order, so they
  // load a page instead of the whole library. Favorites/Archived stay complete:
  // their reorder writes an order row for every note in the context.
  const refresh = useCallback(
    () =>
      Promise.allSettled([
        fetchNotes({ archived: false, deleted: false, limit: 24 }),
        noteService.getAllNotes({ favorite: true, archived: false, deleted: false }).then((d) => { setFavorites(d); setCachedList('home:favorites', d); }),
        noteService.getAllNotes({ archived: true, deleted: false }).then((d) => { setArchived(d); setCachedList('home:archived', d); }),
        noteService.getAllNotes({ deleted: true, limit: 24 }).then((d) => { setDeleted(d); setCachedList('home:deleted', d); }),
        noteService.getAllNotes({ shared: true }).then((d) => { setShared(d); setCachedList('home:shared', d); }),
      ]),
    [fetchNotes],
  );

  // Reorder the visible cards, keep the rest after them, then persist the full order.
  const makeReorder = useCallback(
    (setList: React.Dispatch<React.SetStateAction<Note[]>>, contextType: string) =>
      (reordered: Note[]) => {
        setList((prev) => {
          const full = [...reordered, ...prev.slice(reordered.length)];
          noteService
            .reorderNotes(full.map((n, i) => ({ id: n.id, order: i })), contextType, null)
            .catch(() => {});
          return full;
        });
      },
    [],
  );
  const handleFavReorder = useMemo(() => makeReorder(setFavorites, 'favorites'), [makeReorder]);
  const handleArchReorder = useMemo(() => makeReorder(setArchived, 'archive'), [makeReorder]);

  // `recent`/spaces are store-backed and update on their own; these sections hold their
  // own copies, so patch the new cover in instead of waiting for the next refetch.
  const handleCoverChange = useCallback((target: CoverTarget, coverImage: string) => {
    if (target.kind !== 'note') return;
    const patch = (prev: Note[]) => prev.map((n) => (n.id === target.id ? { ...n, coverImage } : n));
    setFavorites(patch);
    setArchived(patch);
    setShared(patch);
    setDeleted(patch);
  }, []);
  const handleSpaceReorder = useCallback(
    (reordered: Space[]) => reorderSpaces([...reordered, ...spaces.slice(reordered.length)]),
    [spaces, reorderSpaces],
  );

  const noteMenu = useNoteCardMenu({ onEdit: onOpenInline, onAfterChange: refresh, onSetCover: (n) => setCoverTarget({ kind: 'note', id: n.id }) });
  const spaceMenu = useSpaceCardMenu({ onAfterChange: fetchSpaces, onSetCover: (s) => setCoverTarget({ kind: 'space', id: s.id }) });

  useEffect(() => {
    Promise.allSettled([refresh(), fetchSpaces()]).then(() => setArmed(true));
    fetchToday();
  }, [refresh, fetchSpaces, fetchToday]);

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
      // Server-side bulk delete — the loaded section is only a page of the trash.
      await noteService.emptyTrash();
      toast.success('Trash emptied');
    } catch {
      toast.error('Could not empty trash');
    } finally {
      setShowEmptyTrash(false);
      refresh();
    }
  };

  const [reflectionCollapsed, setReflectionCollapsed] = useState(false);
  const [reflectionAnimating, setReflectionAnimating] = useState(false);
  const firstName = (user?.name || user?.email || '').split(/[\s@]/)[0];
  const greeting = greetingFor(firstName);
  const scrollRef = useRef<HTMLElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  useLenisScroll(scrollRef, contentRef, 'home');

  // The greeting only plays its entrance animation on a fresh login or when the
  // time-of-day bucket flips while open — not on reload or in-app navigation.
  const [animateGreeting, setAnimateGreeting] = useState(() => !!sessionStorage.getItem('justLoggedIn'));
  const [greetingKey, setGreetingKey] = useState(0);
  const salutationRef = useRef(salutationFor());

  useEffect(() => {
    sessionStorage.removeItem('justLoggedIn');
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      const next = salutationFor();
      if (next !== salutationRef.current) {
        salutationRef.current = next;
        setAnimateGreeting(true);
        setGreetingKey((k) => k + 1);
      }
    }, 60_000);
    return () => clearInterval(id);
  }, []);

  // Full sorted list; the whole section scrolls horizontally, so no slice. Pinned
  // first (then by recency) so the order matches the all-notes view's pinned group.
  const recent = useMemo(
    () =>
      // Trashing/archiving only flips the flag in the store (and bumps updatedAt) until
      // the refetch lands — filter those out so the card doesn't resort to the front
      // before it leaves, which would make the exit animation jump.
      notes
        .filter((n) => !n.isDeleted && !n.isArchived)
        .sort((a, b) => {
          if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        }),
    [notes],
  );
  const recentWheelRef = useWheelHorizontal();
  const recentContainerRef = useRef<HTMLDivElement | null>(null);
  // One node, two refs: useCardFlip owns the RefObject, useWheelHorizontal the listener.
  const recentRowRef = useCallback((node: HTMLDivElement | null) => { recentContainerRef.current = node; recentWheelRef(node); }, [recentWheelRef]);
  useCardFlip(recentContainerRef, armed);
  const recentRendered = useLeaving(recent, (n) => n.id);

  // Per-section actions, rendered next to the section title (mirrors the views).
  const newNoteBtn = (
    <button type="button" className="home-view-action" onClick={(e) => handleNewNote(e.currentTarget.getBoundingClientRect())} title="New note">
      <Plus size={16} strokeWidth={1.75} />
    </button>
  );
  const newSpaceBtn = (
    <button type="button" className="home-view-action" onClick={() => setShowCreateSpace(true)} title="New space">
      <Plus size={16} strokeWidth={1.75} />
    </button>
  );
  const emptyTrashBtn = deleted.length > 0 ? (
    <button type="button" className="home-view-action danger" onClick={() => setShowEmptyTrash(true)} title="Delete all">
      <Trash2 size={16} strokeWidth={1.75} />
    </button>
  ) : null;

  return (
    <main ref={scrollRef} className="home-main">
      <div ref={contentRef} className="home-content">
        <div className="home-topbar">
          <DarkModeToggle className="home-icon-btn" />
          <button type="button" className="home-icon-btn" onClick={() => setShowSettings(true)} title="Settings">
            <Icons.settings size={18} />
          </button>
          <NotificationsBell onAccepted={refresh} onOpenProfile={onOpenProfile} onOpenNote={onOpenNote} />
          <button type="button" className="home-icon-btn" onClick={(e) => handleNewNote(e.currentTarget.getBoundingClientRect())} title="New note">
            <SquarePen size={18} strokeWidth={1.75} />
          </button>
        </div>

        <header className="home-header">
          {animateGreeting ? (
            <SplitText
              key={greetingKey}
              text={greeting}
              tag="p"
              className="home-greeting"
              splitType="chars"
              delay={40}
              duration={0.5}
              ease="power3.out"
              from={{ opacity: 0, y: 14 }}
              to={{ opacity: 1, y: 0 }}
              threshold={0}
              rootMargin="0px"
              textAlign="left"
            />
          ) : (
            <p className="home-greeting">{greeting}</p>
          )}
          <h1 className="home-headline">
            What would you like<br />to think about today?
          </h1>
        </header>

        <HomeSearch onOpenNote={onOpenNote} onOpenSpace={onOpenSpace} />

        <section className="home-section">
          <div className="home-section-head">
            <div className="home-section-title-row">
              <h2 className="home-section-title">Daily Reflection</h2>
              <button
                type="button"
                className="home-section-chevron"
                onClick={() => { setReflectionAnimating(true); setReflectionCollapsed((c) => !c); }}
                aria-label={reflectionCollapsed ? 'Expand' : 'Collapse'}
              >
                <ChevronDown size={15} strokeWidth={1.75} style={{ transform: reflectionCollapsed ? 'rotate(-180deg)' : 'none', transition: 'transform .2s ease' }} />
              </button>
            </div>
          </div>
          <div
            style={{ display: 'grid', gridTemplateRows: reflectionCollapsed ? '0fr' : '1fr', transition: 'grid-template-rows .22s ease', overflow: reflectionCollapsed || reflectionAnimating ? 'hidden' : 'visible' }}
            onTransitionEnd={(e) => { if (e.target === e.currentTarget) setReflectionAnimating(false); }}
          >
            <div style={{ minHeight: 0 }}>
              <button type="button" className="reflection-teaser" onClick={onReflection}>
                <span className="reflection-teaser-prompt">{reflectionPrompt ? quotePrompt(reflectionPrompt) : 'A quiet question, once a day.'}</span>
                <span className="reflection-teaser-cue">Reflect <ArrowRight size={14} /></span>
              </button>
            </div>
          </div>
        </section>

        <Section title="Continue Thinking" action={newNoteBtn} onViewAll={() => onOpenCategory('all')}>
          {recent.length === 0 ? (
            <p className="home-empty">Nothing yet — your recent thoughts will gather here.</p>
          ) : (
            <div ref={recentRowRef} className="home-card-row cols-4">
              {recentRendered.map(({ item: note, leaving }, i) => (
                <CoverCard
                  key={note.id}
                  index={i}
                  leaving={leaving}
                  flipId={note.id}
                  title={noteLabel(note)}
                  subtitle={`Last explored ${timeAgo(note.updatedAt)}`}
                  cover={note.coverImage}
                  seed={note.id}
                  onClick={() => onOpenInline(note)}
                  onSetCover={() => setCoverTarget({ kind: 'note', id: note.id })}
                  onContextMenu={(e) => noteMenu.openMenu(e, note)}
                />
              ))}
            </div>
          )}
        </Section>

        <DraggableSpaceSection
          title="Spaces"
          spaces={spaces}
          emptyText="No spaces yet — create one to organise your thinking."
          action={newSpaceBtn}
          onViewAll={onAllSpaces}
          onOpen={onOpenSpace}
          onMenu={spaceMenu.openMenu}
          onSetCover={(s) => setCoverTarget({ kind: 'space', id: s.id })}
          onReorder={handleSpaceReorder}
          armed={armed}
        />

        <NoteSection title="Collaborations" notes={shared} emptyText="No collaborations yet." onViewAll={() => onOpenCategory('shared')} onOpen={onOpenInline} onMenu={noteMenu.openMenu} onSetCover={(n) => setCoverTarget({ kind: 'note', id: n.id })} armed={armed} />

        <DraggableNoteSection title="Favorites" notes={favorites} emptyText="No favorites yet." onViewAll={() => onOpenCategory('favorites')} onOpen={onOpenInline} onMenu={noteMenu.openMenu} onSetCover={(n) => setCoverTarget({ kind: 'note', id: n.id })} onReorder={handleFavReorder} armed={armed} />
        <DraggableNoteSection title="Archived" notes={archived} emptyText="Nothing archived." onViewAll={() => onOpenCategory('archived')} onOpen={onOpenInline} onMenu={noteMenu.openMenu} onSetCover={(n) => setCoverTarget({ kind: 'note', id: n.id })} onReorder={handleArchReorder} armed={armed} />
        <NoteSection title="Deleted" notes={deleted} emptyText="Trash is empty." action={emptyTrashBtn} onViewAll={() => onOpenCategory('trash')} onOpen={onOpenInline} onMenu={noteMenu.openMenu} onSetCover={(n) => setCoverTarget({ kind: 'note', id: n.id })} armed={armed} />
      </div>

      <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} />
      <CoverPickerModal target={coverTarget} onClose={() => setCoverTarget(null)} onCoverChange={handleCoverChange} />
      <CreateFolderModal isOpen={showCreateSpace} onClose={() => setShowCreateSpace(false)} onFolderCreated={fetchSpaces} />
      <EmptyTrashModal isOpen={showEmptyTrash} onClose={() => setShowEmptyTrash(false)} onConfirm={handleEmptyTrash} />
      {noteMenu.element}
      {spaceMenu.element}
    </main>
  );
};

// ─── Sub-components ──────────────────────────────────────────────────────────

interface SectionProps {
  title: string;
  action?: React.ReactNode;
  onViewAll: () => void;
  children: React.ReactNode;
}

const Section = ({ title, action, onViewAll, children }: SectionProps) => {
  const [collapsed, setCollapsed] = useState(false);
  // Clip only while collapsed or mid-animation; once open and idle, let overflow
  // show so the card hover-lift isn't cut off at the top.
  const [animating, setAnimating] = useState(false);
  return (
    <section className="home-section">
      <div className="home-section-head">
        <div className="home-section-title-row">
          <h2 className="home-section-title">{title}</h2>
          <button
            type="button"
            className="home-section-chevron"
            onClick={() => { setAnimating(true); setCollapsed((c) => !c); }}
            aria-label={collapsed ? 'Expand' : 'Collapse'}
          >
            <ChevronDown size={15} strokeWidth={1.75} style={{ transform: collapsed ? 'rotate(-180deg)' : 'none', transition: 'transform .2s ease' }} />
          </button>
          {action}
        </div>
        <button type="button" className="home-view-all" onClick={onViewAll}>
          View all <ArrowRight size={13} />
        </button>
      </div>
      <div
        // minmax(0,1fr) column: without it the auto grid column grows to the row's
        // max-content (all cards), defeating the row's overflow-x scroll.
        style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gridTemplateRows: collapsed ? '0fr' : '1fr', transition: 'grid-template-rows .22s ease', overflow: collapsed || animating ? 'hidden' : 'visible' }}
        onTransitionEnd={(e) => { if (e.target === e.currentTarget) setAnimating(false); }}
      >
        <div style={{ minHeight: 0, minWidth: 0 }}>{children}</div>
      </div>
    </section>
  );
};

interface NoteSectionProps {
  title: string;
  notes: Note[];
  emptyText: string;
  action?: React.ReactNode;
  onViewAll: () => void;
  onOpen: (note: Note) => void;
  onMenu: (e: React.MouseEvent, note: Note) => void;
  onSetCover: (note: Note) => void;
  // Set true once Home's first load has landed (gates the mount FLIP).
  armed?: boolean;
}

// Compact note grid — same shape and card size as the Spaces section. The full
// list lives in one horizontally scrolling row.
const NoteSection = ({ title, notes, emptyText, action, onViewAll, onOpen, onMenu, onSetCover, armed }: NoteSectionProps) => {
  const wheelRef = useWheelHorizontal();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const rowRef = useCallback((node: HTMLDivElement | null) => { containerRef.current = node; wheelRef(node); }, [wheelRef]);
  useCardFlip(containerRef, armed);
  const rendered = useLeaving(notes, (n) => n.id);
  return (
    <Section title={title} action={action} onViewAll={onViewAll}>
      {notes.length === 0 ? (
        <p className="home-empty">{emptyText}</p>
      ) : (
        <div ref={rowRef} className="home-card-row cols-5">
          {rendered.map(({ item: note, leaving }, i) => (
            <CoverCard
              key={note.id}
              index={i}
              leaving={leaving}
              flipId={note.id}
              title={noteLabel(note)}
              cover={note.coverImage}
              seed={note.id}
              compact
              onClick={() => onOpen(note)}
              onSetCover={() => onSetCover(note)}
              onContextMenu={(e) => onMenu(e, note)}
            />
          ))}
        </div>
      )}
    </Section>
  );
};

interface DraggableNoteSectionProps extends NoteSectionProps {
  onReorder: (notes: Note[]) => void;
}

// Same as NoteSection, but the cards can be dragged to reorder (2D FLIP + persist).
const DraggableNoteSection = ({ title, notes, emptyText, onViewAll, onOpen, onMenu, onSetCover, onReorder, armed }: DraggableNoteSectionProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const wheelRef = useWheelHorizontal();
  const { order, draggingId, onCardPointerDown } = useGridReorder({
    items: notes,
    getId: (n) => n.id,
    containerRef,
    onReorder,
    axis: 'x',
    armed,
  });
  // One node, two refs: useGridReorder owns the RefObject, useWheelHorizontal the listener.
  const setGrid = useCallback((node: HTMLDivElement | null) => { containerRef.current = node; wheelRef(node); }, [wheelRef]);
  const rendered = useLeaving(order, (n) => n.id);
  return (
    <Section title={title} onViewAll={onViewAll}>
      {notes.length === 0 ? (
        <p className="home-empty">{emptyText}</p>
      ) : (
        <div ref={setGrid} className="home-card-row cols-5">
          {rendered.map(({ item: note, leaving }, i) => (
            <CoverCard
              key={note.id}
              index={i}
              leaving={leaving}
              flipId={note.id}
              dragging={draggingId === note.id}
              onPointerDown={leaving ? undefined : (e) => onCardPointerDown(e, note)}
              title={noteLabel(note)}
              cover={note.coverImage}
              seed={note.id}
              compact
              onClick={() => onOpen(note)}
              onSetCover={() => onSetCover(note)}
              onContextMenu={(e) => onMenu(e, note)}
            />
          ))}
        </div>
      )}
    </Section>
  );
};

interface DraggableSpaceSectionProps {
  title: string;
  spaces: Space[];
  emptyText: string;
  action?: React.ReactNode;
  onViewAll: () => void;
  onOpen: (id: string, name: string) => void;
  onMenu: (e: React.MouseEvent, space: Space) => void;
  onSetCover: (space: Space) => void;
  onReorder: (spaces: Space[]) => void;
  // Set true once Home's first load has landed (gates the mount FLIP).
  armed?: boolean;
}

// Spaces variant of DraggableNoteSection — space cards can be dragged to reorder.
const DraggableSpaceSection = ({ title, spaces, emptyText, action, onViewAll, onOpen, onMenu, onSetCover, onReorder, armed }: DraggableSpaceSectionProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const wheelRef = useWheelHorizontal();
  const { order, draggingId, onCardPointerDown } = useGridReorder({
    items: spaces,
    getId: (s) => s.id,
    containerRef,
    onReorder,
    axis: 'x',
    armed,
  });
  // One node, two refs: useGridReorder owns the RefObject, useWheelHorizontal the listener.
  const setGrid = useCallback((node: HTMLDivElement | null) => { containerRef.current = node; wheelRef(node); }, [wheelRef]);
  const rendered = useLeaving(order, (s) => s.id);
  return (
    <Section title={title} action={action} onViewAll={onViewAll}>
      {spaces.length === 0 ? (
        <p className="home-empty">{emptyText}</p>
      ) : (
        <div ref={setGrid} className="home-card-row cols-5">
          {rendered.map(({ item: space, leaving }, i) => (
            <CoverCard
              key={space.id}
              index={i}
              leaving={leaving}
              flipId={space.id}
              dragging={draggingId === space.id}
              onPointerDown={leaving ? undefined : (e) => onCardPointerDown(e, space)}
              title={space.name}
              cover={space.coverImage}
              seed={space.id}
              compact
              onClick={() => onOpen(space.id, space.name)}
              onSetCover={() => onSetCover(space)}
              onContextMenu={(e) => onMenu(e, space)}
            />
          ))}
        </div>
      )}
    </Section>
  );
};

export default HomeView;
