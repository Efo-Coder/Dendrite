import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Note } from '../types';
import { noteService } from '../services/note.service';
import { useNoteStore } from '../store/useNoteStore';
import { useLenisScroll } from '../hooks/useLenisScroll';
import { useToast } from '../components/ui/ToastContainer';
import { getApiErrorMessage } from '../lib/apiError';
import CoverPickerModal, { type CoverTarget } from '../components/home/CoverPickerModal';
import NoteMonthGrid from '../components/home/NoteMonthGrid';
import DraggableNoteGrid from '../components/home/DraggableNoteGrid';
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
  shared:    { greeting: 'Shared with me',  headline: 'Notes opened to you.',        empty: 'Nothing shared with you yet.', filter: { shared: true } },
};

// Categories whose order is draggable + persisted; value is the backend contextType
// (shared with the matching Home section, so the order stays in sync both ways).
const ORDER_CONTEXT: Partial<Record<NoteCategory, string>> = {
  favorites: 'favorites',
  archived: 'archive',
  shared: 'shared',
};

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
  const [notes, setNotes] = useState<Note[]>(() => getCachedList<Note>(`notes:${category}`) ?? []);
  const [coverTarget, setCoverTarget] = useState<CoverTarget | null>(null);
  const [showEmptyTrash, setShowEmptyTrash] = useState(false);
  // FLIP stays silent until the first network load lands, so the cache→network reconcile
  // doesn't glide the cards when the view opens.
  const [armed, setArmed] = useState(false);
  const createNote = useNoteStore((s) => s.createNote);
  const deleteNote = useNoteStore((s) => s.deleteNote);
  const toast = useToast();
  const scrollRef = useRef<HTMLElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  useLenisScroll(scrollRef, contentRef, `notes:${category}`);

  const load = useCallback(() => {
    noteService.getAllNotes(META[category].filter).then((d) => { setNotes(d); setCachedList(`notes:${category}`, d); setArmed(true); }).catch(() => {});
  }, [category]);

  useEffect(() => { load(); }, [load, refreshSignal]);

  const setCover = (n: Note) => setCoverTarget({ kind: 'note', id: n.id });
  const noteMenu = useNoteCardMenu({ onEdit: onOpenInline, onAfterChange: load, onSetCover: setCover });

  const pinned = useMemo(() => notes.filter((n) => n.isPinned), [notes]);
  const rest = useMemo(() => notes.filter((n) => !n.isPinned), [notes]);

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
      await Promise.all(notes.map((n) => deleteNote(n.id)));
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
          {notes.length > 0 && <p className="home-count">{noteCountLabel(notes.length)}</p>}
        </header>

        {notes.length === 0 ? (
          <p className="home-empty">{meta.empty}</p>
        ) : category === 'trash' ? (
          <NoteMonthGrid notes={notes} onOpen={onOpenInline} onMenu={noteMenu.openMenu} onSetCover={setCover} armed={armed} />
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
                  />
                </section>
              ) : (
                <NoteMonthGrid notes={rest} onOpen={onOpenInline} onMenu={noteMenu.openMenu} onSetCover={setCover} armed={armed} />
              ))}
          </>
        )}
      </div>

      <CoverPickerModal target={coverTarget} onClose={() => setCoverTarget(null)} onCoverChange={handleCoverChange} />
      {noteMenu.element}
      <EmptyTrashModal isOpen={showEmptyTrash} onClose={() => setShowEmptyTrash(false)} onConfirm={handleEmptyTrash} />
    </main>
  );
};

export default NotesView;
