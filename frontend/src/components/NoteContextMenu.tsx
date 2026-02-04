import { useEffect, useRef } from 'react';
import { Edit, Trash2, Pin, Star, Archive, Tag, FolderOpen } from 'lucide-react';

interface NoteContextMenuProps {
  isOpen: boolean;
  position: { x: number; y: number };
  onClose: () => void;
  onEdit: () => void;
  onMove: () => void;
  onPin: () => void;
  onFavorite: () => void;
  onArchive: () => void;
  onTag: () => void;
  onDelete: () => void;
  note: {
    isPinned: boolean;
    isFavorite: boolean;
    isArchived: boolean;
    isDeleted: boolean;
  };
}

const NoteContextMenu = ({ 
  isOpen, 
  position, 
  onClose, 
  onEdit, 
  onMove, 
  onPin, 
  onFavorite, 
  onArchive, 
  onTag, 
  onDelete,
  note 
}: NoteContextMenuProps) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const isInTrash = note.isDeleted;
  const isArchived = note.isArchived && !note.isDeleted;

  return (
    <div
      ref={menuRef}
      className="fixed z-50 glass-panel rounded-xl shadow-lg py-1 min-w-[180px]"
      style={{
        left: position.x,
        top: position.y,
      }}
    >
      {/* Edit - only show if not in trash */}
      {!isInTrash && (
        <button
          onClick={() => {
            onEdit();
            onClose();
          }}
          className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-accent-900 hover-highlight transition-colors"
        >
          <Edit className="w-4 h-4" />
          <span>Bearbeiten</span>
        </button>
      )}

      {/* Move - only show if not in trash */}
      {!isInTrash && (
        <button
          onClick={() => {
            onMove();
            onClose();
          }}
          className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-accent-900 hover-highlight transition-colors"
        >
          <FolderOpen className="w-4 h-4" />
          <span>Verschieben</span>
        </button>
      )}

      {/* Pin - only show if not in trash */}
      {!isInTrash && (
        <button
          onClick={() => {
            onPin();
            onClose();
          }}
          className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-accent-900 hover-highlight transition-colors"
        >
          <Pin className="w-4 h-4" />
          <span>{note.isPinned ? 'Anheften entfernen' : 'Anpinnen'}</span>
        </button>
      )}

      {/* Favorite - only show if not in trash */}
      {!isInTrash && (
        <button
          onClick={() => {
            onFavorite();
            onClose();
          }}
          className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-accent-900 hover-highlight transition-colors"
        >
          <Star className="w-4 h-4" />
          <span>{note.isFavorite ? 'Aus Favoriten entfernen' : 'Favorisieren'}</span>
        </button>
      )}

      {/* Archive - only show if not in trash */}
      {!isInTrash && (
        <button
          onClick={() => {
            onArchive();
            onClose();
          }}
          className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-accent-900 hover-highlight transition-colors"
        >
          <Archive className="w-4 h-4" />
          <span>{note.isArchived ? 'Aus Archiv holen' : 'Archivieren'}</span>
        </button>
      )}

      {/* Tag - only show if not in trash */}
      {!isInTrash && (
        <button
          onClick={() => {
            onTag();
            onClose();
          }}
          className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-accent-900 hover-highlight transition-colors"
        >
          <Tag className="w-4 h-4" />
          <span>Tag</span>
        </button>
      )}

      {/* Delete */}
      <button
        onClick={() => {
          onDelete();
          onClose();
        }}
        className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
      >
        <Trash2 className="w-4 h-4" />
        <span>{isInTrash ? 'Endgültig löschen' : 'Löschen'}</span>
      </button>
    </div>
  );
};

export default NoteContextMenu;

