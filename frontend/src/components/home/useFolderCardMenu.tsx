import { useCallback, useState } from 'react';
import { Edit, Trash2 } from 'lucide-react';
import { Folder } from '../../types';
import { useFolderStore } from '../../store/useFolderStore';
import { useToast } from '../ui/ToastContainer';
import ContextMenu from '../ui/ContextMenu';
import EditFolderModal from '../modals/EditFolderModal';
import Modal from '../modals/Modal';

interface Options {
  onAfterChange?: () => void;
}

// Right-click actions for space (folder) cards — mirrors the sidebar's folder menu.
export function useFolderCardMenu({ onAfterChange }: Options) {
  const { deleteFolder } = useFolderStore();
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

  const handleEdit = () => { if (menu.folder) { setTarget(menu.folder); setShowEditModal(true); } };
  const handleDelete = () => { if (menu.folder) { setTarget(menu.folder); setShowDeleteModal(true); } };

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
          { icon: <Edit className="w-4 h-4" />, label: 'Edit', onClick: handleEdit },
          { icon: <Trash2 className="w-4 h-4" />, label: 'Delete', onClick: handleDelete, variant: 'danger' },
        ]}
        minWidth="160px"
      />
      <EditFolderModal
        isOpen={showEditModal}
        onClose={() => { setShowEditModal(false); setTarget(null); }}
        onFolderUpdated={onAfterChange}
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
