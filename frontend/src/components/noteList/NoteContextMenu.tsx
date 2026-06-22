import { Edit, ImagePlus, Pencil, Trash2, Pin, Archive, Tag, FolderOpen, RotateCcw } from 'lucide-react';
import ContextMenu, { ContextMenuItem } from '../ui/ContextMenu';
import { Icons } from '../ui/Icons';

interface NoteContextMenuProps {
  isOpen: boolean;
  position: { x: number; y: number };
  onClose: () => void;
  onEdit: () => void;
  onRename: () => void;
  onSetCover: () => void;
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

const NoteContextMenu = ({ isOpen, position, onClose, onEdit, onRename, onSetCover, onMove, onPin, onFavorite, onArchive, onTag, onDelete, onRestore, note }: NoteContextMenuProps) => {
  const isInTrash = note.isDeleted;

  const items: ContextMenuItem[] = [
    ...(!isInTrash ? [
      { icon: <Pencil className="w-4 h-4" />, label: 'Rename', onClick: onRename },
      { icon: <Edit className="w-4 h-4" />, label: 'Edit', onClick: onEdit },
      { icon: <ImagePlus className="w-4 h-4" />, label: 'Add cover', onClick: onSetCover },
      { icon: <Pin className="w-4 h-4" />, label: note.isPinned ? 'Unpin' : 'Pin', onClick: onPin },
      { icon: note.isFavorite ? <Icons.starFill size={16} /> : <Icons.star size={16} />, label: note.isFavorite ? 'Remove from favorites' : 'Add to favorites', onClick: onFavorite },
      { icon: <Archive className="w-4 h-4" />, label: note.isArchived ? 'Unarchive' : 'Archive', onClick: onArchive },
      { icon: <FolderOpen className="w-4 h-4" />, label: 'Move', onClick: onMove },
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
