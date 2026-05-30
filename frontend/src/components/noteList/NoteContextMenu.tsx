import { Edit, Trash2, Pin, Archive, Tag, FolderOpen, RotateCcw } from 'lucide-react';
import ContextMenu, { ContextMenuItem } from '../ui/ContextMenu';
import { Icons } from '../ui/Icons';

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
  onRestore: () => void;
  note: {
    isPinned: boolean;
    isFavorite: boolean;
    isArchived: boolean;
    isDeleted: boolean;
  };
}

const NoteContextMenu = ({ isOpen, position, onClose, onEdit, onMove, onPin, onFavorite, onArchive, onTag, onDelete, onRestore, note }: NoteContextMenuProps) => {
  const isInTrash = note.isDeleted;

  const items: ContextMenuItem[] = [
    ...(!isInTrash ? [
      { icon: <Edit className="w-4 h-4" />, label: 'Edit', onClick: onEdit },
      { icon: <FolderOpen className="w-4 h-4" />, label: 'Move', onClick: onMove },
      { icon: <Pin className="w-4 h-4" />, label: note.isPinned ? 'Unpin' : 'Pin', onClick: onPin },
      { icon: note.isFavorite ? <Icons.starFill size={16} /> : <Icons.star size={16} />, label: note.isFavorite ? 'Remove from favorites' : 'Add to favorites', onClick: onFavorite },
      { icon: <Archive className="w-4 h-4" />, label: note.isArchived ? 'Unarchive' : 'Archive', onClick: onArchive },
      { icon: <Tag className="w-4 h-4" />, label: 'Tag', onClick: onTag },
    ] : []),
    ...(isInTrash ? [
      { icon: <RotateCcw className="w-4 h-4" />, label: 'Restore', onClick: onRestore },
    ] : []),
    { icon: <Trash2 className="w-4 h-4" />, label: isInTrash ? 'Delete permanently' : 'Delete', onClick: onDelete, variant: 'danger' },
  ];

  return <ContextMenu isOpen={isOpen} position={position} onClose={onClose} items={items} minWidth="180px" />;
};

export default NoteContextMenu;
