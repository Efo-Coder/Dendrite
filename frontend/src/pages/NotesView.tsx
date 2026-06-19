import { useCallback, useEffect, useRef, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Note } from '../types';
import { noteService } from '../services/note.service';
import { useNoteStore } from '../store/useNoteStore';
import { useLenisScroll } from '../hooks/useLenisScroll';
import { useToast } from '../components/ui/ToastContainer';
import { getApiErrorMessage } from '../lib/apiError';
import CoverPickerModal, { type CoverTarget } from '../components/home/CoverPickerModal';
import NoteMonthGrid from '../components/home/NoteMonthGrid';
import { useNoteCardMenu } from '../components/home/useNoteCardMenu';
import BackButton from '../components/home/BackButton';
import EmptyTrashModal from '../components/modals/EmptyTrashModal';
import { noteCountLabel } from '../lib/noteText';

export type NoteCategory = 'all' | 'pinned' | 'favorites' | 'archived' | 'trash' | 'shared';

interface CategoryMeta {
  greeting: string;
  headline: string;
  empty: string;
  filter: { pinned?: boolean; favorite?: boolean; archived?: boolean; deleted?: boolean; shared?: boolean };
}

const META: Record<NoteCategory, CategoryMeta> = {
  all:       { greeting: 'Thoughts',        headline: 'Everything you’ve written.',  empty: 'No notes yet.',              filter: { archived: false, deleted: false } },
  pinned:    { greeting: 'Pinned',          headline: 'What you keep close.',        empty: 'No pinned notes yet.',       filter: { pinned: true, archived: false, deleted: false } },
  favorites: { greeting: 'Favorites',       headline: 'The thoughts you love.',      empty: 'No favorites yet.',          filter: { favorite: true, archived: false, deleted: false } },
  archived:  { greeting: 'Archived',        headline: 'Set aside, not forgotten.',   empty: 'Nothing archived.',          filter: { archived: true, deleted: false } },
  trash:     { greeting: 'Deleted',         headline: 'On its way out.',             empty: 'Trash is empty.',            filter: { deleted: true } },
  shared:    { greeting: 'Shared with me',  headline: 'Notes opened to you.',        empty: 'Nothing shared with you yet.', filter: { shared: true } },
};

interface NotesViewProps {
  category: NoteCategory;
  onOpenInline: (note: Note) => void;
  onBack: () => void;
}

// One view per Home category (mirrors SpacesView) — all notes of the category as a grid.
const NotesView = ({ category, onOpenInline, onBack }: NotesViewProps) => {
  const meta = META[category];
  const [notes, setNotes] = useState<Note[]>([]);
  const [coverTarget, setCoverTarget] = useState<CoverTarget | null>(null);
  const [showEmptyTrash, setShowEmptyTrash] = useState(false);
  const createNote = useNoteStore((s) => s.createNote);
  const deleteNote = useNoteStore((s) => s.deleteNote);
  const toast = useToast();
  const scrollRef = useRef<HTMLElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  useLenisScroll(scrollRef, contentRef);

  const load = useCallback(() => {
    noteService.getAllNotes(META[category].filter).then(setNotes).catch(() => {});
  }, [category]);

  useEffect(() => { load(); }, [load]);

  const noteMenu = useNoteCardMenu({ onEdit: onOpenInline, onAfterChange: load });

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
            <button type="button" className="home-view-action" onClick={handleNewNote}>
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
        ) : (
          <NoteMonthGrid
            notes={notes}
            onOpen={onOpenInline}
            onMenu={noteMenu.openMenu}
            onSetCover={(n) => setCoverTarget({ kind: 'note', id: n.id })}
          />
        )}
      </div>

      <CoverPickerModal target={coverTarget} onClose={() => setCoverTarget(null)} />
      {noteMenu.element}
      <EmptyTrashModal isOpen={showEmptyTrash} onClose={() => setShowEmptyTrash(false)} onConfirm={handleEmptyTrash} />
    </main>
  );
};

export default NotesView;
