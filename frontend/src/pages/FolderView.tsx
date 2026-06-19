import { useCallback, useEffect, useRef, useState } from 'react';
import { Plus } from 'lucide-react';
import { Note } from '../types';
import { noteService } from '../services/note.service';
import { useNoteStore } from '../store/useNoteStore';
import { useFolderStore } from '../store/useFolderStore';
import { useLenisScroll } from '../hooks/useLenisScroll';
import { useToast } from '../components/ui/ToastContainer';
import { getApiErrorMessage } from '../lib/apiError';
import CoverPickerModal, { type CoverTarget } from '../components/home/CoverPickerModal';
import NoteMonthGrid from '../components/home/NoteMonthGrid';
import { useNoteCardMenu } from '../components/home/useNoteCardMenu';
import BackButton from '../components/home/BackButton';
import { noteCountLabel } from '../lib/noteText';

interface FolderViewProps {
  folderId: string;
  onOpenInline: (note: Note) => void;
  onBack: () => void;
}

// A single space's notes as a month-grouped card grid (replaces the old workspace
// folder view).
const FolderView = ({ folderId, onOpenInline, onBack }: FolderViewProps) => {
  const folders = useFolderStore((s) => s.folders);
  const fetchFolders = useFolderStore((s) => s.fetchFolders);
  const createNote = useNoteStore((s) => s.createNote);
  const toast = useToast();
  const [notes, setNotes] = useState<Note[]>([]);
  const [coverTarget, setCoverTarget] = useState<CoverTarget | null>(null);
  const scrollRef = useRef<HTMLElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  useLenisScroll(scrollRef, contentRef);

  const folder = folders.find((f) => f.id === folderId);

  const load = useCallback(() => {
    noteService.getAllNotes({ folderId, archived: false, deleted: false }).then(setNotes).catch(() => {});
  }, [folderId]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (!folder) fetchFolders(); }, [folder, fetchFolders]);

  const noteMenu = useNoteCardMenu({ onEdit: onOpenInline, onAfterChange: load });

  const handleNewNote = async () => {
    try {
      const note = await createNote({ content: '', folderId });
      onOpenInline(note);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Could not create note'));
    }
  };

  return (
    <main ref={scrollRef} className="home-main">
      <div ref={contentRef} className="home-content">
        <div className="home-view-topbar">
          <button type="button" className="home-view-action" onClick={handleNewNote}>
            <Plus size={16} strokeWidth={1.75} /> New Note
          </button>
          <BackButton onClick={onBack} />
        </div>
        <header className="home-header">
          <p className="home-greeting">Space</p>
          <h1 className="home-headline">{folder?.name ?? '…'}</h1>
          {notes.length > 0 && <p className="home-count">{noteCountLabel(notes.length)}</p>}
        </header>

        {notes.length === 0 ? (
          <p className="home-empty">This space is empty — start a note to fill it.</p>
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
    </main>
  );
};

export default FolderView;
