import { useCallback, useState } from 'react';
import { Edit, ImagePlus, Pencil, Pin, Trash2 } from 'lucide-react';
import { Space } from '../../types';
import { useSpaceStore } from '../../store/useSpaceStore';
import { spaceService } from '../../services/space.service';
import { useToast } from '../ui/ToastContainer';
import ContextMenu from '../ui/ContextMenu';
import EditFolderModal from '../modals/EditFolderModal';
import Modal from '../modals/Modal';
import { useRename } from './RenameContext';

interface Options {
  onAfterChange?: () => void;
  // Opens the view's cover picker for this space (the view owns the modal).
  onSetCover?: (space: Space) => void;
}

// Right-click actions for space cards — mirrors the folder card menu.
export function useSpaceCardMenu({ onAfterChange, onSetCover }: Options) {
  const { deleteSpace, updateSpace } = useSpaceStore();
  const rename = useRename();
  const toast = useToast();

  const [menu, setMenu] = useState<{ isOpen: boolean; position: { x: number; y: number }; space: Space | null }>(
    { isOpen: false, position: { x: 0, y: 0 }, space: null },
  );
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [target, setTarget] = useState<Space | null>(null);

  const openMenu = useCallback((e: React.MouseEvent, space: Space) => {
    e.preventDefault();
    e.stopPropagation();
    setMenu({ isOpen: true, position: { x: e.clientX, y: e.clientY }, space });
  }, []);

  const closeMenu = useCallback(() => setMenu((p) => ({ ...p, isOpen: false })), []);

  const handlePin = async () => {
    if (!menu.space) return;
    const wasPinned = menu.space.isPinned;
    try { await spaceService.togglePin(menu.space.id); toast.success(wasPinned ? 'Unpinned' : 'Space pinned'); onAfterChange?.(); }
    catch { toast.error('Could not pin space'); }
  };
  const handleEdit = () => { if (menu.space) { setTarget(menu.space); setShowEditModal(true); } };
  const handleDelete = () => { if (menu.space) { setTarget(menu.space); setShowDeleteModal(true); } };
  const handleSetCover = () => { if (menu.space) onSetCover?.(menu.space); };
  const handleRename = () => {
    const space = menu.space;
    if (!space) return;
    rename.begin(space.id, async (value) => {
      const name = value.trim();
      if (!name || name === space.name) return;
      try { await updateSpace(space.id, { name }); onAfterChange?.(); }
      catch { toast.error('Could not rename space'); }
    });
  };

  const confirmDelete = async () => {
    if (!target) return;
    try { await deleteSpace(target.id); toast.success('Space deleted'); onAfterChange?.(); }
    catch { toast.error('Error deleting space'); }
    finally { setShowDeleteModal(false); setTarget(null); }
  };

  const element = (
    <>
      <ContextMenu
        isOpen={menu.isOpen}
        position={menu.position}
        onClose={closeMenu}
        items={[
          { icon: <Pencil className="w-4 h-4" />, label: 'Rename', onClick: handleRename },
          { icon: <Edit className="w-4 h-4" />, label: 'Edit', onClick: handleEdit },
          { icon: <ImagePlus className="w-4 h-4" />, label: 'Add cover', onClick: handleSetCover },
          { icon: <Pin className="w-4 h-4" />, label: menu.space?.isPinned ? 'Unpin' : 'Pin', onClick: handlePin },
          { icon: <Trash2 className="w-4 h-4" />, label: 'Delete', onClick: handleDelete, variant: 'danger' },
        ]}
        minWidth="160px"
      />
      <EditFolderModal
        isOpen={showEditModal}
        onClose={() => { setShowEditModal(false); setTarget(null); }}
        onFolderUpdated={onAfterChange}
        kind="space"
        folder={target}
      />
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Delete space?"
        showFooter
        confirmLabel="Delete"
        onConfirm={confirmDelete}
        confirmVariant="danger"
      >
        <p className="text-sm text-(--ink-mid)">
          Are you sure you want to delete the space "{target?.name}"? Its folders are removed; the notes inside become top-level notes. This cannot be undone.
        </p>
      </Modal>
    </>
  );

  return { openMenu, element };
}
