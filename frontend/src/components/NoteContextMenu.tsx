import { Edit, Trash2, Pin, Star, Archive, Tag, FolderOpen } from 'lucide-react';
import GlassContextMenu, { ContextMenuItem } from './GlassContextMenu';

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

const NoteContextMenu = ({ isOpen, position, onClose, onEdit, onMove, onPin, onFavorite, onArchive, onTag, onDelete, note }: NoteContextMenuProps) => {
  const isInTrash = note.isDeleted;

  const items: ContextMenuItem[] = [
    ...(!isInTrash ? [
      { icon: <Edit className="w-4 h-4" />, label: 'Bearbeiten', onClick: onEdit },
      { icon: <FolderOpen className="w-4 h-4" />, label: 'Verschieben', onClick: onMove },
      { icon: <Pin className="w-4 h-4" />, label: note.isPinned ? 'Anheften entfernen' : 'Anpinnen', onClick: onPin },
      { icon: <Star className="w-4 h-4" />, label: note.isFavorite ? 'Aus Favoriten entfernen' : 'Favorisieren', onClick: onFavorite },
      { icon: <Archive className="w-4 h-4" />, label: note.isArchived ? 'Aus Archiv holen' : 'Archivieren', onClick: onArchive },
      { icon: <Tag className="w-4 h-4" />, label: 'Tag', onClick: onTag },
    ] : []),
    { icon: <Trash2 className="w-4 h-4" />, label: isInTrash ? 'Endgültig löschen' : 'Löschen', onClick: onDelete, variant: 'danger' },
  ];

  return <GlassContextMenu isOpen={isOpen} position={position} onClose={onClose} items={items} minWidth="180px" />;
};

export default NoteContextMenu;
