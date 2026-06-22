import { useCallback, useState } from 'react';
import { Edit, ImagePlus, Pencil, Pin, Trash2 } from 'lucide-react';
import { Folder } from '../../types';
import { useFolderStore } from '../../store/useFolderStore';
import { folderService } from '../../services/folder.service';
import { useToast } from '../ui/ToastContainer';
import ContextMenu from '../ui/ContextMenu';
import EditFolderModal from '../modals/EditFolderModal';
import Modal from '../modals/Modal';
import { useRename } from './RenameContext';

interface Options {
  onAfterChange?: () => void;
  // Opens the view's cover picker for this folder (the view owns the modal).
  onSetCover?: (folder: Folder) => void;
}

// Right-click actions for space (folder) cards — mirrors the sidebar's folder menu.
export function useFolderCardMenu({ onAfterChange, onSetCover }: Options) {
  const { deleteFolder, updateFolder } = useFolderStore();
  const rename = useRename();
  const toast = useToast();

  const [menu, setMenu] = useState<{ isOpen: boolean; position: { x: number; y: number }; folder: Folder | null }>(
    { isOpen: false, position: { x: 0, y: 0 }, folder: null },
  );
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  // The action modals outlive the closing context menu, so they hold their own target.
  const [target, setTarget] = useState<Folder | null>(null);

  const openMenu = useCallback((e: React.MouseEvent, folder: Folder) => {
    e.preventDefault();
    e.stopPropagation();
    setMenu({ isOpen: true, position: { x: e.clientX, y: e.clientY }, folder });
  }, []);

  const closeMenu = useCallback(() => setMenu((p) => ({ ...p, isOpen: false })), []);

  const handlePin = async () => {
    if (!menu.folder) return;
    const wasPinned = menu.folder.isPinned;
    try { await folderService.togglePin(menu.folder.id); toast.success(wasPinned ? 'Unpinned' : 'Space pinned'); onAfterChange?.(); }
    catch { toast.error('Could not pin space'); }
  };
  const handleEdit = () => { if (menu.folder) { setTarget(menu.folder); setShowEditModal(true); } };
  const handleDelete = () => { if (menu.folder) { setTarget(menu.folder); setShowDeleteModal(true); } };
  const handleSetCover = () => { if (menu.folder) onSetCover?.(menu.folder); };
  const handleRename = () => {
    const folder = menu.folder;
    if (!folder) return;
    rename.begin(folder.id, async (value) => {
      const name = value.trim();
      if (!name || name === folder.name) return;
      try { await updateFolder(folder.id, { name }); onAfterChange?.(); }
      catch { toast.error('Could not rename folder'); }
    });
  };

  const confirmDelete = async () => {
    if (!target) return;
    try { await deleteFolder(target.id); toast.success('Folder deleted'); onAfterChange?.(); }
    catch { toast.error('Error deleting folder'); }
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
          { icon: <Pin className="w-4 h-4" />, label: menu.folder?.isPinned ? 'Unpin' : 'Pin', onClick: handlePin },
          { icon: <Trash2 className="w-4 h-4" />, label: 'Delete', onClick: handleDelete, variant: 'danger' },
        ]}
        minWidth="160px"
      />
      <EditFolderModal
        isOpen={showEditModal}
        onClose={() => { setShowEditModal(false); setTarget(null); }}
        onFolderUpdated={onAfterChange}
        kind="folder"
        folder={target}
      />
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Delete folder?"
        showFooter
        confirmLabel="Delete"
        onConfirm={confirmDelete}
        confirmVariant="danger"
      >
        <p className="text-sm text-(--ink-mid)">
          Are you sure you want to delete the folder "{target?.name}"? This action cannot be undone.
        </p>
      </Modal>
    </>
  );

  return { openMenu, element };
}
