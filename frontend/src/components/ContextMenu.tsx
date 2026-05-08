import { Edit, Trash2 } from 'lucide-react';
import GlassContextMenu, { ContextMenuItem } from './GlassContextMenu';

interface ContextMenuProps {
  isOpen: boolean;
  position: { x: number; y: number };
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

const ContextMenu = ({ isOpen, position, onClose, onEdit, onDelete }: ContextMenuProps) => {
  const items: ContextMenuItem[] = [
    { icon: <Edit className="w-4 h-4" />, label: 'Bearbeiten', onClick: onEdit },
    { icon: <Trash2 className="w-4 h-4" />, label: 'Löschen', onClick: onDelete, variant: 'danger' },
  ];

  return <GlassContextMenu isOpen={isOpen} position={position} onClose={onClose} items={items} minWidth="160px" />;
};

export default ContextMenu;
