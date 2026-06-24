import { useState, useEffect } from 'react';
import { Bookmark, Plus } from 'lucide-react';
import { useBookmarkStore } from '../../store/useBookmarkStore';
import { useToast } from '../ui/ToastContainer';
import Modal from './Modal';
import CreateBookmarkModal from './CreateBookmarkModal';

interface BookmarkSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdateBookmarks: (bookmarkIds: string[]) => void;
  currentBookmarkIds: string[];
}

const BookmarkSelectionModal = ({ isOpen, onClose, onUpdateBookmarks, currentBookmarkIds }: BookmarkSelectionModalProps) => {
  const { bookmarks, fetchBookmarks } = useBookmarkStore();
  const [showCreateBookmarkModal, setShowCreateBookmarkModal] = useState(false);
  const [selectedBookmarkIds, setSelectedBookmarkIds] = useState<string[]>(currentBookmarkIds);
  const toast = useToast();

  useEffect(() => {
    if (isOpen) {
      fetchBookmarks();
      setSelectedBookmarkIds(currentBookmarkIds);
    }
    // currentBookmarkIds creates a new array reference on every render (.map()),
    // so we only sync on open to avoid an infinite re-render loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const handleBookmarkToggle = (bookmarkId: string) => {
    setSelectedBookmarkIds(prev => {
      if (prev.includes(bookmarkId)) return prev.filter(id => id !== bookmarkId);
      if (prev.length >= 4) { toast.warning('Maximum 4 bookmarks per note'); return prev; }
      return [...prev, bookmarkId];
    });
  };

  const handleSave = () => {
    onUpdateBookmarks(selectedBookmarkIds);
    onClose();
  };

  const handleCreateBookmark = () => {
    setShowCreateBookmarkModal(true);
  };

  const handleBookmarkCreated = () => {
    setShowCreateBookmarkModal(false);
    fetchBookmarks();
    toast.success('Bookmark created');
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Manage bookmarks"
        showFooter={true}
        confirmLabel="Save"
        onConfirm={handleSave}
      >
        <div className="space-y-4">
          <p className="text-sm text-(--ink-mid)">
            Select the bookmarks to associate with this note:
          </p>

          <div className="modal-list-scroll space-y-1">
              {bookmarks.length === 0 ? (
                <div className="text-center py-8 text-(--ink-mid)">
                  <Bookmark className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No bookmarks yet</p>
                </div>
              ) : (
                bookmarks.map((bookmark) => {
                  const isSelected = selectedBookmarkIds.includes(bookmark.id);
                  const atLimit = selectedBookmarkIds.length >= 4 && !isSelected;
                  return (
                    <button
                      key={bookmark.id}
                      onClick={() => handleBookmarkToggle(bookmark.id)}
                      disabled={atLimit}
                      className={`w-full flex items-center space-x-2 px-3 py-2 rounded-lg text-left transition-colors ${
                        atLimit
                          ? 'opacity-40 cursor-not-allowed'
                          : 'hover:bg-(--surface-hi)'
                      } ${isSelected ? 'text-(--ink)' : 'text-(--ink-mid)'}`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}}
                        className="w-4 h-4 rounded border-white/30 shrink-0"
                        style={{ accentColor: bookmark.color }}
                      />
                      <Bookmark className="w-4 h-4 shrink-0" style={{ color: bookmark.color }} />
                      <span className="text-sm">{bookmark.name}</span>
                    </button>
                  );
                })
              )}

              <div className="border-b border-(--line-soft)" />

              <button
                onClick={handleCreateBookmark}
                className="w-full flex items-center space-x-2 px-3 py-2 rounded-lg text-left transition-colors text-(--ink) hover:bg-(--surface-hi)"
              >
                <Plus className="w-4 h-4" />
                <span className="text-sm">Create new bookmark</span>
              </button>
          </div>

          <div className="text-xs text-(--ink-mid)">
            {selectedBookmarkIds.length}/4 bookmarks selected
          </div>
        </div>
      </Modal>

      <CreateBookmarkModal
        isOpen={showCreateBookmarkModal}
        onClose={() => setShowCreateBookmarkModal(false)}
        onBookmarkSaved={handleBookmarkCreated}
      />
    </>
  );
};

export default BookmarkSelectionModal;
