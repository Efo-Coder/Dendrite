import { useCallback, useEffect, useRef, useState } from 'react';
import { Plus, Pencil, Trash2, Bookmark as BookmarkIcon } from 'lucide-react';
import { Bookmark, Note } from '../types';
import { useBookmarkStore } from '../store/useBookmarkStore';
import { noteService } from '../services/note.service';
import { useLenisScroll } from '../hooks/useLenisScroll';
import { useViewMode } from '../hooks/useViewMode';
import { useToast } from '../components/ui/ToastContainer';
import { getCachedList, setCachedList } from '../lib/listCache';
import BackButton from '../components/home/BackButton';
import ViewModeToggle from '../components/home/ViewModeToggle';
import DraggableNoteGrid from '../components/home/DraggableNoteGrid';
import CoverPickerModal, { type CoverTarget } from '../components/home/CoverPickerModal';
import { useNoteCardMenu } from '../components/home/useNoteCardMenu';
import ContextMenu from '../components/ui/ContextMenu';
import CreateBookmarkModal from '../components/modals/CreateBookmarkModal';
import Modal from '../components/modals/Modal';

interface LibraryViewProps {
  onOpenInline: (note: Note, originRect?: DOMRect) => void;
  onBack: () => void;
  // Bumped when the editor closes → refetch so created/edited notes reflect.
  refreshSignal?: number;
}

const CACHE_KEY = 'library:notes';

// Every bookmark becomes a category (like the "Pinned" group), holding the notes
// that carry it. Notes are fetched once and grouped client-side (a note can sit
// under several bookmarks).
const LibraryView = ({ onOpenInline, onBack, refreshSignal }: LibraryViewProps) => {
  const bookmarks = useBookmarkStore((s) => s.bookmarks);
  const fetchBookmarks = useBookmarkStore((s) => s.fetchBookmarks);
  const deleteBookmark = useBookmarkStore((s) => s.deleteBookmark);
  const toast = useToast();

  const [view, setView] = useViewMode('library');
  const [notes, setNotes] = useState<Note[]>(() => getCachedList<Note>(CACHE_KEY) ?? []);
  const [armed, setArmed] = useState(false);
  const [coverTarget, setCoverTarget] = useState<CoverTarget | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [editTarget, setEditTarget] = useState<Bookmark | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Bookmark | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [menu, setMenu] = useState<{ isOpen: boolean; position: { x: number; y: number }; bookmark: Bookmark | null }>(
    { isOpen: false, position: { x: 0, y: 0 }, bookmark: null },
  );

  const scrollRef = useRef<HTMLElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  useLenisScroll(scrollRef, contentRef, 'library');

  const loadNotes = useCallback(() => {
    noteService
      .getAllNotes({ archived: false, deleted: false })
      .then((d) => { setNotes(d); setCachedList(CACHE_KEY, d); setArmed(true); })
      .catch(() => {});
  }, []);

  useEffect(() => { fetchBookmarks(); }, [fetchBookmarks]);
  useEffect(() => { loadNotes(); }, [loadNotes, refreshSignal]);

  const reload = useCallback(() => { fetchBookmarks(); loadNotes(); }, [fetchBookmarks, loadNotes]);

  const setCover = (n: Note) => setCoverTarget({ kind: 'note', id: n.id });
  const noteMenu = useNoteCardMenu({ onEdit: onOpenInline, onAfterChange: loadNotes, onSetCover: setCover });

  // Patch a new cover into the local list so the card reflects it before the next load.
  const handleCoverChange = useCallback((target: CoverTarget, coverImage: string) => {
    if (target.kind !== 'note') return;
    setNotes((prev) => prev.map((n) => (n.id === target.id ? { ...n, coverImage } : n)));
  }, []);

  const openMenu = (e: React.MouseEvent, bookmark: Bookmark) => {
    e.preventDefault();
    e.stopPropagation();
    setMenu({ isOpen: true, position: { x: e.clientX, y: e.clientY }, bookmark });
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await deleteBookmark(deleteTarget.id);
      toast.success('Bookmark deleted');
      setDeleteTarget(null);
      loadNotes();
    } catch {
      toast.error('Could not delete bookmark');
    } finally {
      setIsDeleting(false);
    }
  };

  const menuBookmark = menu.bookmark;

  return (
    <main ref={scrollRef} className="home-main">
      <div ref={contentRef} className="home-content">
        <div className="home-view-topbar">
          {notes.length > 0 && <ViewModeToggle value={view} onChange={setView} />}
          <button type="button" className="home-view-action" onClick={() => setShowCreate(true)}>
            <Plus size={16} strokeWidth={1.75} /> New Bookmark
          </button>
          <BackButton onClick={onBack} />
        </div>
        <header className="home-header">
          <p className="home-greeting">Library</p>
          <h1 className="home-headline">Every thread you’ve saved.</h1>
        </header>

        {bookmarks.length === 0 ? (
          <p className="home-empty">No bookmarks yet — create one to start grouping your notes.</p>
        ) : (
          bookmarks.map((bookmark) => {
            const group = notes.filter((n) => n.bookmarks?.some((b) => b.id === bookmark.id));
            return (
              <section key={bookmark.id} className="notes-month-group">
                <div
                  className="notes-month-label"
                  onContextMenu={(e) => openMenu(e, bookmark)}
                  title="Right-click to rename or delete"
                >
                  <BookmarkIcon size={12} strokeWidth={2} style={{ color: bookmark.color }} />
                  {bookmark.name}
                </div>
                {group.length > 0 ? (
                  <DraggableNoteGrid
                    notes={group}
                    onOpen={onOpenInline}
                    onMenu={noteMenu.openMenu}
                    onSetCover={setCover}
                    armed={armed}
                    view={view}
                    showSubtitle
                  />
                ) : (
                  <p className="home-empty" style={{ margin: '0 0 8px' }}>No notes yet.</p>
                )}
              </section>
            );
          })
        )}
      </div>

      <ContextMenu
        isOpen={menu.isOpen}
        position={menu.position}
        onClose={() => setMenu((p) => ({ ...p, isOpen: false }))}
        items={[
          { icon: <Pencil className="w-4 h-4" />, label: 'Rename', onClick: () => menuBookmark && setEditTarget(menuBookmark) },
          { icon: <Trash2 className="w-4 h-4" />, label: 'Delete', onClick: () => menuBookmark && setDeleteTarget(menuBookmark), variant: 'danger' },
        ]}
      />

      <CoverPickerModal target={coverTarget} onClose={() => setCoverTarget(null)} onCoverChange={handleCoverChange} />
      {noteMenu.element}

      <CreateBookmarkModal isOpen={showCreate} onClose={() => setShowCreate(false)} onBookmarkSaved={reload} />
      <CreateBookmarkModal
        isOpen={!!editTarget}
        editBookmark={editTarget ?? undefined}
        onClose={() => setEditTarget(null)}
        onBookmarkSaved={reload}
      />

      <Modal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete bookmark"
        showFooter
        confirmLabel="Delete"
        confirmVariant="danger"
        onConfirm={handleDelete}
        isConfirming={isDeleting}
        confirmingLabel="Deleting…"
      >
        <p className="text-sm text-(--ink-mid)">
          Delete “{deleteTarget?.name}”? It will be removed from all notes. This can’t be undone.
        </p>
      </Modal>
    </main>
  );
};

export default LibraryView;
