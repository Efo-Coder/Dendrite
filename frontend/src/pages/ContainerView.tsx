import { useCallback, useEffect, useRef, useState } from 'react';
import { FolderPlus, Plus } from 'lucide-react';
import { Folder, Note } from '../types';
import { noteService } from '../services/note.service';
import { folderService } from '../services/folder.service';
import { spaceService } from '../services/space.service';
import { useNoteStore } from '../store/useNoteStore';
import { useLenisScroll } from '../hooks/useLenisScroll';
import { useToast } from '../components/ui/ToastContainer';
import { getApiErrorMessage } from '../lib/apiError';
import CoverPickerModal, { type CoverTarget } from '../components/home/CoverPickerModal';
import DraggableNoteGrid from '../components/home/DraggableNoteGrid';
import DraggableFolderGrid from '../components/home/DraggableFolderGrid';
import { useNoteCardMenu } from '../components/home/useNoteCardMenu';
import { useFolderCardMenu } from '../components/home/useFolderCardMenu';
import BackButton from '../components/home/BackButton';
import CreateFolderModal from '../components/modals/CreateFolderModal';
import { noteCountLabel } from '../lib/noteText';
import { getCachedList, setCachedList } from '../lib/listCache';

interface ContainerViewProps {
  kind: 'space' | 'folder';
  id: string;
  backLabel: string;
  onOpenFolder: (folder: Folder) => void;
  onOpenInline: (note: Note, originRect?: DOMRect) => void;
  onBack: () => void;
  // Bumped when the editor closes → refetch so created/edited notes reflect.
  refreshSignal?: number;
}

// A single space or folder: its child folders + its notes (both drag-reorderable),
// with actions to add either.
const ContainerView = ({ kind, id, backLabel, onOpenFolder, onOpenInline, onBack, refreshSignal }: ContainerViewProps) => {
  const createNote = useNoteStore((s) => s.createNote);
  const toast = useToast();
  const [name, setName] = useState('…');
  // The space a new folder/note belongs to: the space itself, or the folder's space.
  const [spaceId, setSpaceId] = useState(kind === 'space' ? id : '');
  // Hydrated from the session cache so the layout is final on reload (exact scroll).
  const foldersKey = `container-folders:${kind}:${id}`;
  const notesKey = `container-notes:${kind}:${id}`;
  const [folders, setFolders] = useState<Folder[]>(() => getCachedList<Folder>(foldersKey) ?? []);
  const [notes, setNotes] = useState<Note[]>(() => getCachedList<Note>(notesKey) ?? []);
  const [coverTarget, setCoverTarget] = useState<CoverTarget | null>(null);
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  // FLIP stays silent per grid until its own first network load lands, so the
  // cache→network reconcile doesn't glide the cards when the container opens.
  const [notesArmed, setNotesArmed] = useState(false);
  const [foldersArmed, setFoldersArmed] = useState(false);
  const scrollRef = useRef<HTMLElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  useLenisScroll(scrollRef, contentRef, `container:${kind}:${id}`);

  const loadFolders = useCallback(() => {
    const params = kind === 'space' ? { spaceId: id } : { parentId: id };
    folderService.getFolders(params).then((d) => { setFolders(d); setCachedList(foldersKey, d); setFoldersArmed(true); }).catch(() => {});
  }, [kind, id, foldersKey]);

  const loadNotes = useCallback(() => {
    const filter = kind === 'space' ? { spaceId: id } : { folderId: id };
    noteService.getAllNotes(filter).then((d) => { setNotes(d); setCachedList(notesKey, d); setNotesArmed(true); }).catch(() => {});
  }, [kind, id, notesKey]);

  useEffect(() => {
    if (kind === 'space') {
      spaceService.getSpaceById(id).then((s) => setName(s.name)).catch(() => {});
    } else {
      folderService.getFolderById(id).then((f) => { setName(f.name); setSpaceId(f.spaceId); }).catch(() => {});
    }
  }, [kind, id]);

  useEffect(() => { loadFolders(); loadNotes(); }, [loadFolders, loadNotes, refreshSignal]);

  const noteMenu = useNoteCardMenu({ onEdit: onOpenInline, onAfterChange: loadNotes, onSetCover: (n) => setCoverTarget({ kind: 'note', id: n.id }) });
  const folderMenu = useFolderCardMenu({ onAfterChange: loadFolders, onSetCover: (f) => setCoverTarget({ kind: 'folder', id: f.id }) });

  // Folder order is a single global field; notes order is per container context.
  const persistFolders = (reordered: Folder[]) => {
    setFolders(reordered);
    folderService.reorderFolders(reordered.map((f, i) => ({ id: f.id, order: i }))).catch(() => {});
  };
  const persistNotes = (reordered: Note[]) => {
    setNotes(reordered);
    const contextType = kind === 'space' ? 'space' : 'folder';
    noteService.reorderNotes(reordered.map((n, i) => ({ id: n.id, order: i })), contextType, id).catch(() => {});
  };

  // Notes and folders here live in local state, not their stores — patch the new cover
  // in so the card reflects it immediately instead of only after the next load.
  const handleCoverChange = useCallback((target: CoverTarget, coverImage: string) => {
    if (target.kind === 'note') setNotes((prev) => prev.map((n) => (n.id === target.id ? { ...n, coverImage } : n)));
    else if (target.kind === 'folder') setFolders((prev) => prev.map((f) => (f.id === target.id ? { ...f, coverImage } : f)));
  }, []);

  const handleNewNote = async (originRect?: DOMRect) => {
    try {
      const note = await createNote(kind === 'space' ? { content: '', spaceId: id } : { content: '', folderId: id });
      onOpenInline(note, originRect);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Could not create note'));
    }
  };

  return (
    <main ref={scrollRef} className="home-main">
      <div ref={contentRef} className="home-content">
        <div className="home-view-topbar">
          <button type="button" className="home-view-action" onClick={() => setShowCreateFolder(true)}>
            <FolderPlus size={16} strokeWidth={1.75} /> New Folder
          </button>
          <button type="button" className="home-view-action" onClick={(e) => handleNewNote(e.currentTarget.getBoundingClientRect())}>
            <Plus size={16} strokeWidth={1.75} /> New Note
          </button>
          <BackButton onClick={onBack} label={backLabel} />
        </div>
        <header className="home-header">
          <p className="home-greeting">{kind === 'space' ? 'Space' : 'Folder'}</p>
          <h1 className="home-headline">{name}</h1>
          {notes.length > 0 && <p className="home-count">{noteCountLabel(notes.length)}</p>}
        </header>

        {notes.length === 0 && folders.length === 0 ? (
          <p className="home-empty">{kind === 'space' ? 'This space is empty — add a folder or a note.' : 'This folder is empty — add a folder or a note.'}</p>
        ) : (
          <>
            {folders.length > 0 && (
              <section className="notes-month-group">
                <div className="notes-month-label">Folders</div>
                <DraggableFolderGrid
                  folders={folders}
                  onOpen={onOpenFolder}
                  onMenu={folderMenu.openMenu}
                  onSetCover={(f) => setCoverTarget({ kind: 'folder', id: f.id })}
                  onReorder={persistFolders}
                  armed={foldersArmed}
                />
              </section>
            )}
            {notes.length > 0 && (
              <section className="notes-month-group notes-rest">
                <div className="notes-month-label">Notes</div>
                <DraggableNoteGrid
                  notes={notes}
                  onOpen={onOpenInline}
                  onMenu={noteMenu.openMenu}
                  onSetCover={(n) => setCoverTarget({ kind: 'note', id: n.id })}
                  onReorder={persistNotes}
                  armed={notesArmed}
                />
              </section>
            )}
          </>
        )}
      </div>

      <CoverPickerModal target={coverTarget} onClose={() => setCoverTarget(null)} onCoverChange={handleCoverChange} />
      <CreateFolderModal
        isOpen={showCreateFolder}
        onClose={() => setShowCreateFolder(false)}
        onFolderCreated={loadFolders}
        spaceId={kind === 'space' ? id : spaceId}
        parentId={kind === 'folder' ? id : undefined}
      />
      {noteMenu.element}
      {folderMenu.element}
    </main>
  );
};

export default ContainerView;
