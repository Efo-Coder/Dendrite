import { useCallback, useState } from 'react';
import { Note } from '../../types';
import { useNoteStore } from '../../store/useNoteStore';
import { useToast } from '../ui/ToastContainer';
import NoteContextMenu from '../noteList/NoteContextMenu';
import MoveToFolderModal from '../modals/MoveToFolderModal';
import BookmarkSelectionModal from '../modals/BookmarkSelectionModal';
import { useRename } from './RenameContext';

interface Options {
  onEdit: (note: Note) => void;
  onAfterChange?: () => void;
  // Opens the view's cover picker for this note (the view owns the modal).
  onSetCover?: (note: Note) => void;
  // Collaborations view: pin is a per-user override, even for own shared notes.
  shared?: boolean;
}

const EMPTY_FLAGS = { isPinned: false, isFavorite: false, isArchived: false, isDeleted: false };

// Right-click actions for note cards — reuses the list's NoteContextMenu plus the
// move/tag modals so the behaviour matches the workspace exactly.
export function useNoteCardMenu({ onEdit, onAfterChange, onSetCover, shared }: Options) {
  const { updateNote, togglePin, toggleFavorite, toggleArchive, toggleTrash, deleteNote, setNoteTitleOptimistic } = useNoteStore();
  const rename = useRename();
  const toast = useToast();

  const [menu, setMenu] = useState<{ isOpen: boolean; position: { x: number; y: number }; note: Note | null }>(
    { isOpen: false, position: { x: 0, y: 0 }, note: null },
  );
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [showBookmarkModal, setShowBookmarkModal] = useState(false);

  const openMenu = useCallback((e: React.MouseEvent, note: Note) => {
    e.preventDefault();
    e.stopPropagation();
    setMenu({ isOpen: true, position: { x: e.clientX, y: e.clientY }, note });
  }, []);

  const closeMenu = useCallback(() => setMenu((p) => ({ ...p, isOpen: false })), []);

  const note = menu.note;

  const handlePin = async () => {
    if (!note) return;
    try { await togglePin(note.id, shared); toast.success(note.isPinned ? 'Unpinned' : 'Note pinned'); onAfterChange?.(); }
    catch { toast.error('Error pinning note'); }
  };

  const handleFavorite = async () => {
    if (!note) return;
    try { await toggleFavorite(note.id); toast.success(note.isFavorite ? 'Removed from favorites' : 'Added to favorites'); onAfterChange?.(); }
    catch { toast.error('Error updating favorites'); }
  };

  const handleArchive = async () => {
    if (!note) return;
    try { await toggleArchive(note.id); toast.success(note.isArchived ? 'Unarchived' : 'Note archived'); onAfterChange?.(); }
    catch { toast.error('Error archiving note'); }
  };

  const handleDelete = async () => {
    if (!note) return;
    try {
      if (note.isDeleted) { await deleteNote(note.id); toast.success('Note permanently deleted'); }
      else { await toggleTrash(note.id); toast.success('Note deleted'); }
      onAfterChange?.();
    } catch { toast.error('Error deleting note'); }
  };

  const handleRestore = async () => {
    if (!note) return;
    try { await toggleTrash(note.id); toast.success('Note restored'); onAfterChange?.(); }
    catch { toast.error('Error restoring note'); }
  };

  const handleSetCover = () => { if (note) onSetCover?.(note); };

  const handleRename = () => {
    if (!note) return;
    const n = note;
    rename.begin(n.id, async (value) => {
      const title = value.trim();
      if (title === (n.title ?? '')) return;
      setNoteTitleOptimistic(n.id, title);
      try { await updateNote(n.id, { title }); onAfterChange?.(); }
      catch { toast.error('Error renaming note'); }
    });
  };

  const handleMoveToFolder = async (folderId: string | null) => {
    if (!note) return;
    try { await updateNote(note.id, { folderId }); toast.success('Note moved'); onAfterChange?.(); }
    catch { toast.error('Error moving note'); }
  };

  const handleUpdateBookmarks = async (bookmarkIds: string[]) => {
    if (!note) return;
    try { await updateNote(note.id, { bookmarks: bookmarkIds }); toast.success('Bookmarks updated'); onAfterChange?.(); }
    catch { toast.error('Error updating bookmarks'); }
  };

  const element = (
    <>
      <NoteContextMenu
        isOpen={menu.isOpen}
        position={menu.position}
        onClose={closeMenu}
        onEdit={() => note && onEdit(note)}
        onRename={handleRename}
        onSetCover={handleSetCover}
        onMove={() => setShowMoveModal(true)}
        onPin={handlePin}
        onFavorite={handleFavorite}
        onArchive={handleArchive}
        onBookmark={() => setShowBookmarkModal(true)}
        onDelete={handleDelete}
        onRestore={handleRestore}
        note={note ?? EMPTY_FLAGS}
      />
      <MoveToFolderModal
        isOpen={showMoveModal}
        onClose={() => setShowMoveModal(false)}
        onMove={handleMoveToFolder}
        currentFolderId={note?.folderId}
      />
      <BookmarkSelectionModal
        isOpen={showBookmarkModal}
        onClose={() => setShowBookmarkModal(false)}
        onUpdateBookmarks={handleUpdateBookmarks}
        currentBookmarkIds={note?.bookmarks?.map((b) => b.id) ?? []}
      />
    </>
  );

  return { openMenu, element };
}
