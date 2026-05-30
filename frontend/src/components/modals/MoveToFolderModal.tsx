import { useState, useEffect } from 'react';
import { FolderOpen, Plus } from 'lucide-react';
import { useFolderStore } from '../../store/useFolderStore';
import { useToast } from '../ui/ToastContainer';
import Modal from './Modal';
import CreateFolderModal from './CreateFolderModal';

interface MoveToFolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMove: (folderId: string | null) => void;
  currentFolderId?: string | null;
}

const MoveToFolderModal = ({ isOpen, onClose, onMove, currentFolderId }: MoveToFolderModalProps) => {
  const { folders, fetchFolders } = useFolderStore();
  const [showCreateFolderModal, setShowCreateFolderModal] = useState(false);
  const toast = useToast();

  useEffect(() => {
    if (isOpen) {
      fetchFolders();
    }
  }, [isOpen, fetchFolders]);

  const handleMove = (folderId: string | null) => {
    onMove(folderId);
    onClose();
  };

  const handleCreateFolder = () => {
    setShowCreateFolderModal(true);
  };

  const handleFolderCreated = () => {
    setShowCreateFolderModal(false);
    fetchFolders();
    toast.success('Folder created');
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title="Move note" showFooter={true}>
        <div className="space-y-4">
          <p className="text-sm text-(--ink-mid)">
            Choose a folder to move the note into:
          </p>

          <div className="modal-list-scroll space-y-1">
              <button
                onClick={() => handleMove(null)}
                className={`w-full flex items-center space-x-2 px-3 py-2 rounded-lg text-left transition-colors hover:bg-(--surface-hi) ${
                  currentFolderId === null || currentFolderId === undefined
                    ? 'text-(--ink)'
                    : 'text-(--ink-mid)'
                }`}
              >
                <FolderOpen className="w-4 h-4 text-(--ink-mid)" />
                <span className="text-sm">No folder</span>
              </button>

              {folders.map((folder) => (
                <button
                  key={folder.id}
                  onClick={() => handleMove(folder.id)}
                  className={`w-full flex items-center space-x-2 px-3 py-2 rounded-lg text-left transition-colors hover:bg-(--surface-hi) ${
                    currentFolderId === folder.id
                      ? 'text-(--ink)'
                      : 'text-(--ink-mid)'
                  }`}
                >
                  <FolderOpen
                    className="w-4 h-4"
                    style={{ color: folder.color || '#10b981' }}
                  />
                  <span className="text-sm">{folder.name}</span>
                </button>
              ))}

              <div className="border-b border-(--line-soft)" />

              <button
                onClick={handleCreateFolder}
                className="w-full flex items-center space-x-2 px-3 py-2 rounded-lg text-left transition-colors text-(--ink) hover:bg-(--surface-hi)"
              >
                <Plus className="w-4 h-4" />
                <span className="text-sm">Create new folder</span>
              </button>
          </div>
        </div>
      </Modal>

      <CreateFolderModal
        isOpen={showCreateFolderModal}
        onClose={() => setShowCreateFolderModal(false)}
        onFolderCreated={handleFolderCreated}
      />
    </>
  );
};

export default MoveToFolderModal;