import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, ChevronDown, Plus, SquarePen, Trash2 } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { useNoteStore } from '../store/useNoteStore';
import { useFolderStore } from '../store/useFolderStore';
import { useReflectionStore } from '../store/useReflectionStore';
import { useToast } from '../components/ui/ToastContainer';
import { getApiErrorMessage } from '../lib/apiError';
import { noteService } from '../services/note.service';
import { Folder, Note } from '../types';
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
import { useNoteCardMenu } from '../components/home/useNoteCardMenu';
import { useFolderCardMenu } from '../components/home/useFolderCardMenu';
import { useGridReorder } from '../components/home/useGridReorder';

interface HomeViewProps {
  onOpenNote: (id: string) => void;
  onOpenInline: (note: Note) => void;
  onOpenSpace: (id: string) => void;
  onOpenCategory: (cat: NoteCategory) => void;
  onAllSpaces: () => void;
  onReflection: () => void;
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

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const day = 86_400_000;
  const days = Math.floor(diff / day);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days} days ago`;
  const weeks = Math.floor(days / 7);
  if (weeks === 1) return '1 week ago';
  if (days < 30) return `${weeks} weeks ago`;
  const months = Math.floor(days / 30);
  return months <= 1 ? '1 month ago' : `${months} months ago`;
}

// Transparent placeholders top a row up to `slots` items, so the real cards keep
// their column width instead of stretching when there are only a few of them.
function fillers(visible: number, slots: number) {
  if (visible === 0 || visible >= slots) return null;
  return Array.from({ length: slots - visible }, (_, i) => (
    <div key={`ph-${i}`} className="home-card-ph" aria-hidden />
  ));
}

const HomeView = ({ onOpenNote, onOpenInline, onOpenSpace, onOpenCategory, onAllSpaces, onReflection }: HomeViewProps) => {
  const user = useAuthStore((s) => s.user);
  const notes = useNoteStore((s) => s.notes);
  const fetchNotes = useNoteStore((s) => s.fetchNotes);
  const folders = useFolderStore((s) => s.folders);
  const fetchFolders = useFolderStore((s) => s.fetchFolders);
  const reorderFolders = useFolderStore((s) => s.reorderFolders);
  const createNote = useNoteStore((s) => s.createNote);
  const deleteNote = useNoteStore((s) => s.deleteNote);
  const reflectionPrompt = useReflectionStore((s) => s.prompt);
  const fetchToday = useReflectionStore((s) => s.fetchToday);
  const toast = useToast();
  const [showSettings, setShowSettings] = useState(false);
  const [coverTarget, setCoverTarget] = useState<CoverTarget | null>(null);
  const [showCreateSpace, setShowCreateSpace] = useState(false);
  const [showEmptyTrash, setShowEmptyTrash] = useState(false);
  // Active notes live in the store; favorites/archived/deleted are fetched separately
  // so the store's main list isn't overwritten. Favorites is loaded in full (not
  // sliced) so drag-reorder can persist the complete order, not just the top 5.
  const [pinned, setPinned] = useState<Note[]>([]);
  const [favorites, setFavorites] = useState<Note[]>([]);
  const [archived, setArchived] = useState<Note[]>([]);
  const [deleted, setDeleted] = useState<Note[]>([]);
  const [shared, setShared] = useState<Note[]>([]);

  const refresh = useCallback(() => {
    fetchNotes({ archived: false, deleted: false });
    noteService.getAllNotes({ pinned: true, archived: false, deleted: false }).then(setPinned).catch(() => {});
    noteService.getAllNotes({ favorite: true, archived: false, deleted: false }).then(setFavorites).catch(() => {});
    noteService.getAllNotes({ archived: true, deleted: false }).then(setArchived).catch(() => {});
    noteService.getAllNotes({ deleted: true }).then(setDeleted).catch(() => {});
    noteService.getAllNotes({ shared: true }).then(setShared).catch(() => {});
  }, [fetchNotes]);

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
  const handlePinReorder = useMemo(() => makeReorder(setPinned, 'all'), [makeReorder]);
  const handleFavReorder = useMemo(() => makeReorder(setFavorites, 'favorites'), [makeReorder]);
  const handleArchReorder = useMemo(() => makeReorder(setArchived, 'archive'), [makeReorder]);
  const handleSpaceReorder = useCallback(
    (reordered: Folder[]) => reorderFolders([...reordered, ...folders.slice(reordered.length)]),
    [folders, reorderFolders],
  );

  const noteMenu = useNoteCardMenu({ onEdit: onOpenInline, onAfterChange: refresh });
  const folderMenu = useFolderCardMenu({ onAfterChange: fetchFolders });

  useEffect(() => {
    refresh();
    fetchFolders();
    fetchToday();
  }, [refresh, fetchFolders, fetchToday]);

  const handleNewNote = async () => {
    try {
      const note = await createNote({ content: '' });
      onOpenInline(note);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Could not create note'));
    }
  };

  const handleEmptyTrash = async () => {
    try {
      await Promise.all(deleted.map((n) => deleteNote(n.id)));
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
  useLenisScroll(scrollRef, contentRef);

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

  const recent = useMemo(
    () =>
      [...notes]
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        .slice(0, 4),
    [notes],
  );

  const spaces = useMemo(() => folders.slice(0, 5), [folders]);
  const sharedTop = useMemo(() => shared.slice(0, 5), [shared]);
  const pinnedTop = useMemo(() => pinned.slice(0, 5), [pinned]);
  const favoritesTop = useMemo(() => favorites.slice(0, 5), [favorites]);
  const archivedTop = useMemo(() => archived.slice(0, 5), [archived]);
  const deletedTop = useMemo(() => deleted.slice(0, 5), [deleted]);

  // Per-section actions, rendered next to the section title (mirrors the views).
  const newNoteBtn = (
    <button type="button" className="home-view-action" onClick={handleNewNote} title="New note">
      <Plus size={16} strokeWidth={1.75} />
    </button>
  );
  const newSpaceBtn = (
    <button type="button" className="home-view-action" onClick={() => setShowCreateSpace(true)} title="New space">
      <Plus size={16} strokeWidth={1.75} />
    </button>
  );
  const emptyTrashBtn = deletedTop.length > 0 ? (
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
          <NotificationsBell onAccepted={refresh} />
          <button type="button" className="home-icon-btn" onClick={handleNewNote} title="New note">
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

        <Section title="Continue Thinking" action={newNoteBtn} onViewAll={() => onOpenCategory('all')}>
          {recent.length === 0 ? (
            <p className="home-empty">Nothing yet — your recent thoughts will gather here.</p>
          ) : (
            <div className="home-card-row cols-4">
              {recent.map((note) => (
                <CoverCard
                  key={note.id}
                  title={noteLabel(note)}
                  subtitle={`Last explored ${timeAgo(note.updatedAt)}`}
                  cover={note.coverImage}
                  seed={note.id}
                  onClick={() => onOpenInline(note)}
                  onSetCover={() => setCoverTarget({ kind: 'note', id: note.id })}
                  onContextMenu={(e) => noteMenu.openMenu(e, note)}
                />
              ))}
              {fillers(recent.length, 4)}
            </div>
          )}
        </Section>

        <DraggableFolderSection
          title="Spaces"
          folders={spaces}
          emptyText="No spaces yet — create one to organise your thinking."
          action={newSpaceBtn}
          onViewAll={onAllSpaces}
          onOpen={onOpenSpace}
          onMenu={folderMenu.openMenu}
          onSetCover={(f) => setCoverTarget({ kind: 'folder', id: f.id })}
          onReorder={handleSpaceReorder}
        />

        <NoteSection title="Shared with me" notes={sharedTop} emptyText="Nothing shared with you yet." onViewAll={() => onOpenCategory('shared')} onOpen={onOpenInline} onMenu={noteMenu.openMenu} onSetCover={(n) => setCoverTarget({ kind: 'note', id: n.id })} />

        <DraggableNoteSection title="Pinned" notes={pinnedTop} emptyText="No pinned notes yet." onViewAll={() => onOpenCategory('pinned')} onOpen={onOpenInline} onMenu={noteMenu.openMenu} onSetCover={(n) => setCoverTarget({ kind: 'note', id: n.id })} onReorder={handlePinReorder} />
        <DraggableNoteSection title="Favorites" notes={favoritesTop} emptyText="No favorites yet." onViewAll={() => onOpenCategory('favorites')} onOpen={onOpenInline} onMenu={noteMenu.openMenu} onSetCover={(n) => setCoverTarget({ kind: 'note', id: n.id })} onReorder={handleFavReorder} />
        <DraggableNoteSection title="Archived" notes={archivedTop} emptyText="Nothing archived." onViewAll={() => onOpenCategory('archived')} onOpen={onOpenInline} onMenu={noteMenu.openMenu} onSetCover={(n) => setCoverTarget({ kind: 'note', id: n.id })} onReorder={handleArchReorder} />
        <NoteSection title="Deleted" notes={deletedTop} emptyText="Trash is empty." action={emptyTrashBtn} onViewAll={() => onOpenCategory('trash')} onOpen={onOpenInline} onMenu={noteMenu.openMenu} onSetCover={(n) => setCoverTarget({ kind: 'note', id: n.id })} />

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
                <span className="reflection-teaser-prompt">{reflectionPrompt || 'A quiet question, once a day.'}</span>
                <span className="reflection-teaser-cue">Reflect <ArrowRight size={14} /></span>
              </button>
            </div>
          </div>
        </section>
      </div>

      <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} />
      <CoverPickerModal target={coverTarget} onClose={() => setCoverTarget(null)} />
      <CreateFolderModal isOpen={showCreateSpace} onClose={() => setShowCreateSpace(false)} onFolderCreated={fetchFolders} />
      <EmptyTrashModal isOpen={showEmptyTrash} onClose={() => setShowEmptyTrash(false)} onConfirm={handleEmptyTrash} />
      {noteMenu.element}
      {folderMenu.element}
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
        style={{ display: 'grid', gridTemplateRows: collapsed ? '0fr' : '1fr', transition: 'grid-template-rows .22s ease', overflow: collapsed || animating ? 'hidden' : 'visible' }}
        onTransitionEnd={(e) => { if (e.target === e.currentTarget) setAnimating(false); }}
      >
        <div style={{ minHeight: 0 }}>{children}</div>
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
}

// Compact note grid — same shape and card size as the Spaces section.
const NoteSection = ({ title, notes, emptyText, action, onViewAll, onOpen, onMenu, onSetCover }: NoteSectionProps) => (
  <Section title={title} action={action} onViewAll={onViewAll}>
    {notes.length === 0 ? (
      <p className="home-empty">{emptyText}</p>
    ) : (
      <div className="home-card-row cols-5">
        {notes.map((note) => (
          <CoverCard
            key={note.id}
            title={noteLabel(note)}
            cover={note.coverImage}
            seed={note.id}
            compact
            onClick={() => onOpen(note)}
            onSetCover={() => onSetCover(note)}
            onContextMenu={(e) => onMenu(e, note)}
          />
        ))}
        {fillers(notes.length, 5)}
      </div>
    )}
  </Section>
);

interface DraggableNoteSectionProps extends NoteSectionProps {
  onReorder: (notes: Note[]) => void;
}

// Same as NoteSection, but the cards can be dragged to reorder (2D FLIP + persist).
const DraggableNoteSection = ({ title, notes, emptyText, onViewAll, onOpen, onMenu, onSetCover, onReorder }: DraggableNoteSectionProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { order, draggingId, onCardPointerDown } = useGridReorder({
    items: notes,
    getId: (n) => n.id,
    containerRef,
    onReorder,
  });
  return (
    <Section title={title} onViewAll={onViewAll}>
      {notes.length === 0 ? (
        <p className="home-empty">{emptyText}</p>
      ) : (
        <div ref={containerRef} className="home-card-row cols-5">
          {order.map((note) => (
            <CoverCard
              key={note.id}
              flipId={note.id}
              dragging={draggingId === note.id}
              onPointerDown={(e) => onCardPointerDown(e, note)}
              title={noteLabel(note)}
              cover={note.coverImage}
              seed={note.id}
              compact
              onClick={() => onOpen(note)}
              onSetCover={() => onSetCover(note)}
              onContextMenu={(e) => onMenu(e, note)}
            />
          ))}
          {fillers(order.length, 5)}
        </div>
      )}
    </Section>
  );
};

interface DraggableFolderSectionProps {
  title: string;
  folders: Folder[];
  emptyText: string;
  action?: React.ReactNode;
  onViewAll: () => void;
  onOpen: (id: string) => void;
  onMenu: (e: React.MouseEvent, folder: Folder) => void;
  onSetCover: (folder: Folder) => void;
  onReorder: (folders: Folder[]) => void;
}

// Spaces variant of DraggableNoteSection — folders can be dragged to reorder.
const DraggableFolderSection = ({ title, folders, emptyText, action, onViewAll, onOpen, onMenu, onSetCover, onReorder }: DraggableFolderSectionProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { order, draggingId, onCardPointerDown } = useGridReorder({
    items: folders,
    getId: (f) => f.id,
    containerRef,
    onReorder,
  });
  return (
    <Section title={title} action={action} onViewAll={onViewAll}>
      {folders.length === 0 ? (
        <p className="home-empty">{emptyText}</p>
      ) : (
        <div ref={containerRef} className="home-card-row cols-5">
          {order.map((folder) => (
            <CoverCard
              key={folder.id}
              flipId={folder.id}
              dragging={draggingId === folder.id}
              onPointerDown={(e) => onCardPointerDown(e, folder)}
              title={folder.name}
              cover={folder.coverImage}
              seed={folder.id}
              compact
              onClick={() => onOpen(folder.id)}
              onSetCover={() => onSetCover(folder)}
              onContextMenu={(e) => onMenu(e, folder)}
            />
          ))}
          {fillers(order.length, 5)}
        </div>
      )}
    </Section>
  );
};

export default HomeView;
